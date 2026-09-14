# 🍔 QuickBite | Full-Stack Food Delivery Web Application

A clean, modern, and simple Full-Stack Food Delivery Web Application built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)**. Features a customer food ordering interface, live shopping cart, order delivery status tracking, and a restaurant menu management system with **16 RESTful APIs** covering all **CRUD** operations.

---

## 🌟 Key Features

- **Appetizing Food Menu**:
  - Browse dishes categorized into **Pizzas**, **Burgers**, **Biryani**, **Asian**, **Desserts**, and **Drinks**.
  - Real-time instant search by dish name, description, or ingredients.
  - **🌱 Pure Veg filter toggle** to instantly filter vegetarian meals.
  - Dish cards with preparation times, ratings, and dietary indicators.
- **Interactive Shopping Cart**:
  - Slide-out cart drawer with instant quantity adjusters (+ / -).
  - Bill summary calculation with delivery fee and total amount.
  - Simple checkout form with customer name, phone, address, and payment method options (Cash on Delivery / UPI).
- **Live Order Status Tracking**:
  - Visual status progress stepper (`Placed` ➔ `Preparing` ➔ `Out for Delivery` ➔ `Delivered`).
  - Ability to cancel or delete orders.
- **Restaurant Menu Management (Admin CRUD)**:
  - **Create**: Add new dishes with price, category, veg/non-veg tag, and image.
  - **Read**: View existing dishes in a clean table format.
  - **Update**: Edit price and description; toggle dishes *In Stock* or *Out of Stock*.
  - **Delete**: Remove dishes permanently from the restaurant menu.
- **Interactive Developer REST API Tester**:
  - Built-in playground modal to execute live requests against all 16 endpoints.
- **1-Click Demo Data Seed**:
  - Automatically loads 8 gourmet dishes and sample delivery orders for instant demonstration.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | HTML5, Modern CSS3, JavaScript (ES6+) | Single-Page Application (SPA) with responsive food cards and slide-out cart |
| **Backend** | Node.js & Express.js | RESTful API server with modular routing and request logging |
| **Database** | MongoDB & Mongoose | NoSQL database with models, validation, and aggregations |
| **Testing** | Node.js Test Runner | Automated verification script testing all endpoints |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+ installed)
- **MongoDB** running locally on port 27017 (or MongoDB Atlas)

### 2. Configuration (`.env`)
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/quickbite_db
NODE_ENV=development
```

### 3. Start the Server
```powershell
npm start
```
Or for auto-reload during development:
```powershell
npm run dev
```

### 4. Open in Browser
Visit 👉 **[http://localhost:5000](http://localhost:5000)**

---

## 📡 Complete RESTful API Reference (16 Endpoints)

| # | HTTP Method | Endpoint Route | CRUD Operation | Description | Success Code |
|---|---|---|---|---|---|
| 1 | `GET` | `/api/foods` | **Read** | List all menu items (with search, category, veg filters) | `200 OK` |
| 2 | `GET` | `/api/foods/:id` | **Read** | Get single food item details | `200 OK` |
| 3 | `POST` | `/api/foods` | **Create** | Add a new dish to the menu | `201 Created` |
| 4 | `PUT` | `/api/foods/:id` | **Update** | Update dish pricing, name, and description | `200 OK` |
| 5 | `PATCH` | `/api/foods/:id/availability` | **Update** | Toggle food in-stock / out-of-stock | `200 OK` |
| 6 | `DELETE` | `/api/foods/:id` | **Delete** | Remove dish from restaurant menu | `200 OK` |
| 7 | `GET` | `/api/orders` | **Read** | List all food delivery orders | `200 OK` |
| 8 | `GET` | `/api/orders/:id` | **Read** | Get single order details and delivery status | `200 OK` |
| 9 | `POST` | `/api/orders` | **Create** | Place a new food delivery order | `201 Created` |
| 10 | `PATCH` | `/api/orders/:id/status` | **Update** | Update order delivery status (Preparing, Out for Delivery, etc.) | `200 OK` |
| 11 | `DELETE` | `/api/orders/:id` | **Delete** | Cancel or delete an order | `200 OK` |
| 12 | `GET` | `/api/reviews/food/:foodId` | **Read** | Get customer reviews for a dish | `200 OK` |
| 13 | `POST` | `/api/reviews` | **Create** | Submit review & recalculate food rating | `201 Created` |
| 14 | `DELETE` | `/api/reviews/:id` | **Delete** | Delete a review | `200 OK` |
| 15 | `GET` | `/api/stats` | **Read** | Business metrics (total orders, revenue, menu count) | `200 OK` |
| 16 | `GET` | `/api/stats/health` | **Read** | Server uptime and MongoDB connection state | `200 OK` |
| 17 | `POST` | `/api/stats/seed` | **Create** | Seed initial gourmet menu and sample orders | `200 OK` |

---

## 🧪 Automated API Testing

Verify all 16+ endpoints and CRUD operations:
```powershell
npm test
```
