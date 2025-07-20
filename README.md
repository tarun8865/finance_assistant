# 💰 Finance Tracker

A modern, full-stack financial management application that helps users track their income, expenses, and analyze spending patterns through an intuitive interface with beautiful animations.

![Typeface Finance Tracker](https://img.shields.io/badge/React-18.2.0-blue)
![Typeface Finance Tracker](https://img.shields.io/badge/Node.js-18+-green)
![Typeface Finance Tracker](https://img.shields.io/badge/MongoDB-6.0+-orange)
![Typeface Finance Tracker](https://img.shields.io/badge/Tailwind-3.3+-cyan)

## ✨ Features

### 🎯 Core Functionality
- **User Authentication**: Secure registration and login system
- **Transaction Management**: Add, view, and categorize income and expenses
- **Receipt Upload**: Upload receipts and PDFs for automatic transaction extraction
- **Data Visualization**: Interactive charts showing spending patterns and category analysis
- **Real-time Analytics**: Live calculation of income, expenses, and balance

### 🎨 User Interface
- **Modern Design**: Clean, minimal interface with beautiful animations
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Interactive Elements**: Hover effects, smooth transitions, and loading states
- **Beautiful Animations**: Bounce-in, slide-up, float, pulse, and scale animations
- **Professional Typography**: Inter font for excellent readability

### 📊 Data Analysis
- **Category-wise Analysis**: Doughnut chart showing expenses by category
- **Time-based Analysis**: Bar chart showing expenses over time
- **Financial Summary**: Real-time calculation of total income, expenses, and balance
- **Transaction History**: Complete record of all financial activities

### 🔧 Technical Features
- **File Processing**: Support for PDF and image uploads
- **Text Extraction**: OCR and PDF text extraction for automatic data parsing
- **Data Validation**: Comprehensive form validation and error handling
- **Secure Storage**: JWT-based authentication with MongoDB
- **GridFS Storage**: Efficient file storage for receipts and documents

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** - Modern UI library
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Icons** - Beautiful icon library
- **Chart.js** - Interactive charts and graphs
- **React Router** - Client-side routing

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Token authentication
- **Multer** - File upload handling
- **GridFS** - File storage in MongoDB
- **pdfjs-dist** - PDF text extraction
- **CORS** - Cross-origin resource sharing

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Nodemon** - Development server with auto-restart

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **MongoDB** (version 6.0 or higher)

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd finance_assistant
```

### 2. Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install
```

#### Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment Variables
Create a `.env` file in the `backend` directory:

```env
PORT=4000
MONGO=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/finance_assistant?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Database Setup

#### MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create a New Cluster**
   - Click "Build a Database"
   - Choose "FREE" tier (M0)
   - Select your preferred cloud provider and region
   - Click "Create"

3. **Set Up Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Create a username and password (save these securely)
   - Select "Read and write to any database"
   - Click "Add User"

4. **Set Up Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<username>`, `<password>`, and `<dbname>` with your actual values

6. **Update Environment Variables**
   - Replace the MONGO variable in your `.env` file with your Atlas connection string

### 5. Running the Application

#### Start Backend Server
```bash
cd backend
node index.js
```

The backend server will start on `http://localhost:4000`

#### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The frontend application will start on `http://localhost:5173`

## 📁 Project Structure

```
finance_assistant/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── fileController.js
│   │   ├── transactionController.js
│   │   └── userController.js
│   ├── models/
│   │   ├── User.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── auth.route.js
│   │   ├── file.route.js
│   │   ├── transaction.route.js
│   │   └── user.route.js
│   ├── middleware/
│   │   └── auth.js
│   ├── uploads/
│   │   ├── 15a492cb206da740a34b1b83e69168b9
│   │   └── 63bed8a44abc3d7663f3bb0b1a8d9d9c
│   ├── eng.traineddata
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/
│   │   │   └── react.svg
│   │   ├── components/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Message.jsx
│   │   │   ├── Overlay.jsx
│   │   │   └── Register.jsx
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

## 🎮 Usage Guide

### 1. User Registration
- Navigate to the registration page
- Fill in your full name, email, and password
- Click "Create Account" to register

### 2. User Login
- Enter your email and password
- Click "Sign In" to access your dashboard

### 3. Adding Transactions
- Click "Add Transaction" button
- Fill in the transaction details (amount, category, description, date)
- Select transaction type (income or expense)
- Click "Add Transaction" to save

### 4. Uploading Receipts
- Click "Upload Receipt" button
- Drag and drop or select a PDF or image file
- The system will automatically extract transaction details
- Review and confirm the extracted information

### 5. Viewing Analytics
- Dashboard shows real-time financial summary
- View category-wise expense breakdown in the doughnut chart
- Analyze spending patterns over time in the bar chart
- Track your balance and financial health

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Transactions
- `GET /api/transactions` - Get user transactions
- `POST /api/transactions` - Add new transaction
- `DELETE /api/transactions/:id` - Delete transaction

### File Upload
- `POST /api/upload` - Upload receipt/PDF for processing

## 🎨 Animation System

The application features a comprehensive animation system:

### Animation Types
- **Bounce In**: Cards and forms entrance
- **Slide Up/Down/Left/Right**: Staggered content animations
- **Scale In**: Success messages and content
- **Float**: Gentle icon floating
- **Pulse**: Loading states and icons
- **Shake**: Error message attention
- **Rotate**: Spinners and loading
- **Glow**: Interactive element highlights
- **Shimmer**: Loading effects
- **Heartbeat**: Important element emphasis

### Animation Features
- Smooth 300ms transitions
- Staggered delays for sequential effects
- Hover effects with scale and shadow
- Active states with scale down
- Focus states with ring effects
- Loading states with pulse and spin
- Error states with shake animation
- Success states with scale-in animation

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password encryption
- **Input Validation**: Comprehensive form validation
- **CORS Protection**: Cross-origin request handling
- **File Upload Security**: Secure file processing
- **Environment Variables**: Sensitive data protection

## 🚀 Deployment

### Backend Deployment (Heroku)
```bash
cd backend
heroku create your-app-name
heroku config:set MONGODB_URI=your_mongodb_atlas_uri
heroku config:set JWT_SECRET=your_jwt_secret
git push heroku main
```

### Frontend Deployment (Vercel)
```bash
cd frontend
vercel --prod
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env file
   - Verify network connectivity

2. **Port Already in Use**
   - Change PORT in backend .env file
   - Kill existing processes on the port

3. **CORS Errors**
   - Verify API_URL in frontend .env
   - Check backend CORS configuration

4. **File Upload Issues**
   - Ensure file size is within limits
   - Check file format (PDF, JPG, PNG)
   - Verify GridFS configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Tarun Kumar**
- GitHub: [@tarunkumar](https://github.com/tarunkumar)
- LinkedIn: [Tarun Kumar](https://linkedin.com/in/tarunkumar)

## 🙏 Acknowledgments

- React team for the amazing framework
- Tailwind CSS for the utility-first approach
- Chart.js for beautiful data visualization
- MongoDB team for the robust database
- All contributors and supporters

---

⭐ **Star this repository if you found it helpful!** 