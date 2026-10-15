// CRUD operations for hotel room records in the hotel management database
const express = require("express");
const mysql = require("mysql2");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "manoj123",
    database: "hotel_management"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        process.exit(1);
    }

    db.query(`
        CREATE TABLE IF NOT EXISTS room (
            room_id INT AUTO_INCREMENT PRIMARY KEY,
            room_number VARCHAR(20) NOT NULL,
            block_name VARCHAR(50) NOT NULL,
            capacity_of_room INT NOT NULL,
            number_of_occupied INT NOT NULL,
            status VARCHAR(30) DEFAULT 'Available'
        )
    `, (createErr) => {
        if (createErr) {
            console.error("Failed to create room table:", createErr.message);
            process.exit(1);
            return;
        }

        db.query(`SELECT COUNT(*) AS count FROM room`, (countErr, result) => {
            if (countErr) {
                console.error("Failed to check room table:", countErr.message);
                return;
            }

            if (result[0].count === 0) {
                const sampleRooms = [
                    ["R101", "Block A", 4, 2, "Available"],
                    ["R102", "Block B", 3, 3, "Full"],
                    ["R103", "Block C", 5, 4, "Available"],
                    ["R104", "Block A", 6, 3, "Available"],
                    ["R105", "Block B", 2, 0, "Available"],
                    ["R101", "Block A", 4, 2, "Available"],
                    ["R102", "Block B", 3, 3, "Full"],
                    ["R103", "Block C", 5, 4, "Available"],
                    ["R104", "Block A", 6, 3, "Available"],
                    ["R105", "Block B", 2, 0, "Available"]
                ];

                sampleRooms.forEach((room, index) => {
                    db.query(
                        "INSERT INTO room (room_number, block_name, capacity_of_room, number_of_occupied, status) VALUES (?, ?, ?, ?, ?)",
                        room,
                        (insertErr) => {
                            if (insertErr) {
                                console.error(`Failed to seed room ${index + 1}:`, insertErr.message);
                            }
                        }
                    );
                });
            }
        });

        console.log("Connected to MySQL and ensured room table exists");
    });
});

function getValue(body, ...keys) {
    for (const key of keys) {
        if (body && body[key] !== undefined && body[key] !== null && body[key] !== "") {
            return body[key];
        }
    }
    return undefined;
}

function listRooms(req, res) {
    db.query("SELECT * FROM room ORDER BY room_id", (err, result) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.json(result);
    });
}

function getRoomByIdentifier(req, res) {
    const roomId = req.params.roomId || req.params.sno;
    const whereClause = req.query.byId === "true"
        ? "room_id=?"
        : "room_id=? OR room_number=?";
    const values = req.query.byId === "true" ? [roomId] : [roomId, roomId];

    db.query(
        `SELECT * FROM room WHERE ${whereClause} ORDER BY room_id`,
        values,
        (err, result) => {
            if (err) {
                res.status(500).send(err.message);
                return;
            }
            res.json(result);
        }
    );
}

function insertRoom(req, res) {
    const roomId = getValue(req.body, "room_id", "roomId", "roomID", "id");
    const roomNumber = getValue(req.body, "room_number", "roomNumber", "room_no", "roomno", "sno");
    const blockName = getValue(req.body, "block_name", "blockName", "block");
    const capacityOfRoom = getValue(req.body, "capacity_of_room", "capacityOfRoom", "capacity");
    const numberOfOccupied = getValue(req.body, "number_of_occupied", "numberOfOccupied", "occupied", "occupiedRooms");
    const status = getValue(req.body, "status", "roomStatus") || "Available";

    if (roomNumber === undefined || blockName === undefined || capacityOfRoom === undefined || numberOfOccupied === undefined) {
        res.status(400).send("Please provide all room details");
        return;
    }

    const insertQuery = roomId === undefined
        ? "INSERT INTO room (room_number, block_name, capacity_of_room, number_of_occupied, status) VALUES (?,?,?,?,?)"
        : "INSERT INTO room (room_id, room_number, block_name, capacity_of_room, number_of_occupied, status) VALUES (?,?,?,?,?,?)";

    const values = roomId === undefined
        ? [roomNumber, blockName, capacityOfRoom, numberOfOccupied, status]
        : [roomId, roomNumber, blockName, capacityOfRoom, numberOfOccupied, status];

    db.query(insertQuery, values, (err, result) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.send("Room Inserted");
    });
}

function updateRoom(req, res) {
    const roomKey = req.params.roomId || req.params.sno;
    const byId = req.query.byId === "true";
    const updates = [];
    const values = [];

    const fields = [
        ["room_number", "roomNumber", "room_no", "roomno", "sno"], 
        ["block_name", "blockName", "block"],
        ["capacity_of_room", "capacityOfRoom", "capacity"],
        ["number_of_occupied", "numberOfOccupied", "occupied", "occupiedRooms"],
        ["status", "roomStatus"]
    ];

    for (const fieldNames of fields) {
        const value = getValue(req.body, ...fieldNames);
        if (value !== undefined) {
            updates.push(`${fieldNames[0]}=?`);
            values.push(value);
        }
    }

    if (updates.length === 0) {
        res.status(400).send("No room details provided for update");
        return;
    }

    values.push(roomKey);
    if (!byId) {
        values.push(roomKey);
    }

    db.query(
        `UPDATE room SET ${updates.join(", ")} WHERE ${byId ? "room_id=?" : "room_id=? OR room_number=?"}`,
        values,
        (err, result) => {
            if (err) {
                res.status(500).send(err.message);
                return;
            }

            if (result.affectedRows === 0) {
                res.status(404).send("Room NOT found");
            } else {
                res.send("Room Updated");
            }
        }
    );
}

function deleteRoom(req, res) {
    const roomKey = req.params.roomId || req.params.sno;
    const byId = req.query.byId === "true";
    const values = byId ? [roomKey] : [roomKey, roomKey];

    db.query(
        `DELETE FROM room WHERE ${byId ? "room_id=?" : "room_id=? OR room_number=?"}`,
        values,
        (err, result) => {
            if (err) {
                res.status(500).send(err.message);
                return;
            }

            if (result.affectedRows === 0) {
                res.status(404).send("Room NOT found to delete");
            } else {
                res.send("Room Deleted");
            }
        }
    );
}

app.get("/rooms", listRooms);
app.get("/students", listRooms);

app.get("/rooms/:roomId", getRoomByIdentifier);
app.get("/students/:sno", getRoomByIdentifier);

app.post("/rooms", insertRoom);
app.post("/students", insertRoom);

app.put("/rooms/:roomId", updateRoom);
app.put("/students/:sno", updateRoom);

app.delete("/rooms/:roomId", deleteRoom);
app.delete("/students/:sno", deleteRoom);

app.listen(3001, () => {
    console.log("Server running at http://localhost:3001"); 
});
