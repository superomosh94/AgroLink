# AgroLink

Agricultural marketplace platform connecting farmers, suppliers, and buyers.

## Features

- 🌾 **Marketplace**: Browse and search agricultural products
- 👤 **User Authentication**: Secure login and registration
- 📊 **Dashboard**: Track sales, products, and analytics
- 📝 **Product Listings**: Easy product management
- 💼 **Multiple User Types**: Farmers, Buyers, and Suppliers

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MySQL
- **Template Engine**: EJS
- **Styling**: Vanilla CSS with modern design system

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd AgroLink
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables
```bash
cp .env.example .env
```
Edit `.env` and configure your database credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=agrolink
```

4. Create database and import schema
```bash
mysql -u root -p
CREATE DATABASE agrolink;
USE agrolink;
SOURCE database/schema.sql;
```

5. Start the development server
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
AgroLink/
├── config/          # Database configuration
├── database/        # SQL schemas
├── public/          # Static assets (CSS, JS, images)
├── routes/          # Express routes
├── views/           # EJS templates
│   ├── partials/    # Reusable components
│   ├── auth/        # Authentication pages
│   ├── market/      # Marketplace pages
│   └── dashboard/   # Dashboard pages
├── server.js        # Application entry point
└── package.json     # Dependencies
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## Features Overview

### Landing Page
- Hero section with call-to-action
- Feature highlights
- Statistics showcase

### Authentication
- User registration with role selection
- Secure login system
- Session management

### Marketplace
- Product grid with search and filters
- Detailed product pages
- Category browsing

### Dashboard
- Sales analytics
- Product management
- Order tracking
- Activity feed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC
