const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const USERS_FILE = "./data/users.txt";
const EVENTS_FILE = "./data/events.txt";
const TICKETS_FILE = "./data/tickets.txt";

function readData(file) {
  if (!fs.existsSync(file)) return [];
  const data = fs.readFileSync(file, "utf8");
  return data ? JSON.parse(data) : [];
}

function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.post("/api/register", (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  const users = readData(USERS_FILE);
  const existing = users.find((u) => u.email === email);
  if (existing)
    return res.status(400).json({ message: "Email already exists" });

  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
    role: role || "user",
  };
  users.push(newUser);
  writeData(USERS_FILE, users);
  res.json({ message: "User registered successfully" });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const users = readData(USERS_FILE);
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  res.json({
    message: "Login successful",
    user: { id: user.id, name: user.name, role: user.role },
  });
});

app.post("/api/events", (req, res) => {
  const { adminEmail, name, category, date, basePrice } = req.body;
  const users = readData(USERS_FILE);
  const admin = users.find((u) => u.email === adminEmail && u.role === "admin");
  if (!admin)
    return res.status(403).json({ message: "Only admin can create events" });

  const events = readData(EVENTS_FILE);
  const newEvent = {
    id: Date.now(),
    name,
    category,
    date,
    basePrice,
  };
  events.push(newEvent);
  writeData(EVENTS_FILE, events);
  res.json({ message: "Event created successfully" });
});

app.post("/api/tickets/book", (req, res) => {
  const { userEmail, eventId, quantity } = req.body;

  const users = readData(USERS_FILE);
  const user = users.find((u) => u.email === userEmail);
  if (!user) return res.status(400).json({ message: "User not found" });

  const events = readData(EVENTS_FILE);
  const event = events.find((e) => e.id == eventId);
  if (!event) return res.status(404).json({ message: "Event not found" });

  const totalAmount = event.basePrice * quantity;

  const tickets = readData(TICKETS_FILE);
  const booking = {
    id: Date.now(),
    userEmail,
    eventId,
    quantity,
    totalAmount,
    status: "booked",
  };
  tickets.push(booking);
  writeData(TICKETS_FILE, tickets);

  res.json({
    message: "Tickets booked successfully",
    bookingId: booking.id,
    totalAmount,
  });
});

app.patch("/api/tickets/cancel/:id", (req, res) => {
  const { id } = req.params;
  const { userEmail } = req.body;

  const tickets = readData(TICKETS_FILE);
  const ticket = tickets.find((t) => t.id == id);
  if (!ticket) return res.status(404).json({ message: "Booking not found" });
  if (ticket.userEmail !== userEmail)
    return res
      .status(403)
      .json({ message: "Not allowed to cancel this booking" });

  ticket.status = "cancelled";
  writeData(TICKETS_FILE, tickets);

  res.json({ message: "Booking cancelled successfully" });
});

app.listen(3000, () => console.log("✅ Server running on port 3000"));
