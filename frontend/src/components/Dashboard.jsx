import { useState, useEffect, useRef } from 'react';
import { 
  FiPlus, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiDollarSign, 
  FiChevronLeft, 
  FiChevronRight, 
  FiChevronDown, 
  FiCalendar, 
  FiUpload, 
  FiTrash2, 
  FiFilter,
  FiBarChart2,
  FiPieChart,
  FiLogOut,
  FiUser,
  FiFileText,
  FiActivity
} from 'react-icons/fi';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);
import Overlay from './Overlay';
import { getTransactions, addTransaction, deleteTransaction, uploadFile } from '../api';
import Button from './Button';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';
import Message from './Message';

// Custom plugin for doughnut center text
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea: { width, height } } = chart;
    const dataset = chart.data.datasets[0];
    const total = dataset.data.reduce((a, b) => a + b, 0);
    if (!total) return;
    ctx.save();
    ctx.font = 'bold 1.5rem sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2563eb';
    ctx.fillText(`₹${total.toLocaleString()}`, width / 2, height / 2);
    ctx.restore();
  }
};

// function currencyFormatter(value) {
//   return `$${value.toLocaleString()}`;
// }

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ type: 'expense', category: '', amount: '', date: '', note: '' });
  const [filter, setFilter] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  //const [graphType, setGraphType] = useState('expense'); // 'expense' or 'income'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef();
  const [showOverlay, setShowOverlay] = useState(false);
  // Transaction history PDF upload
  // const [historyPdf, setHistoryPdf] = useState(null);
  // const historyInputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [uploadMessage, setUploadMessage] = useState(null);

  // Get user info from localStorage
  const email = localStorage.getItem('email') || 'U';
  const userName = localStorage.getItem('userName') || email;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userName');
    window.location.href = '/login';
  };

  // Fetch transactions
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await getTransactions({
        from: filter.from,
        to: filter.to,
        page: currentPage,
        limit: itemsPerPage,
      });
      setTransactions(res.transactions || []);
      setTotalCount(res.count || 0);
      setLoading(false);
    }
    fetchData();
  }, [filter.from, filter.to, currentPage, itemsPerPage]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadMessage(null); // Clear any previous messages
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: fileInputRef.current });
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  const filtered = transactions; // Already filtered by API
  const paginated = filtered; // Already paginated by API

  const handleFormChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount || !form.date) return;
    setAddLoading(true);
    const res = await addTransaction(form);
    setAddLoading(false);
    if (res._id) {
      setShowOverlay(false);
      setForm({ type: 'expense', category: '', amount: '', date: '', note: '' });
      setCurrentPage(1);
      // Refetch transactions
      const updated = await getTransactions({
        from: filter.from,
        to: filter.to,
        page: 1,
        limit: itemsPerPage,
      });
      setTransactions(updated.transactions || []);
      setTotalCount(updated.count || 0);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(id);
    await deleteTransaction(id);
    setDeleteLoading(null);
    // Refetch transactions
    const updated = await getTransactions({
      from: filter.from,
      to: filter.to,
      page: currentPage,
      limit: itemsPerPage,
    });
    setTransactions(updated.transactions || []);
    setTotalCount(updated.count || 0);
  };

  // Calculate totals
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Handle items per page change
  const handleItemsPerPageChange = e => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Handle page change
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Enhanced pagination rendering
  function renderPageButtons() {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1,2,3,4,5,'...',totalPages);
      } else if (currentPage >= totalPages-3) {
        pages.push(1,'...',totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages);
      } else {
        pages.push(1,'...',currentPage-1,currentPage,currentPage+1,'...',totalPages);
      }
    }
    return pages.map((page, idx) =>
      page === '...'
        ? <span key={idx} className="px-3 py-2 text-gray-400">...</span>
        : (
          <button 
            key={page} 
            onClick={() => goToPage(page)} 
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              page === currentPage 
                ? 'bg-primary-600 text-white shadow-sm' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {page}
          </button>
        )
    );
  }

  // Data for graphs (expenses only)
  const expenses = transactions.filter(t => t.type === 'expense');
  // By category
  const categoryTotals = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const categoryData = {
    labels: Object.keys(categoryTotals),
    datasets: [{
      data: Object.values(categoryTotals),
      backgroundColor: [
        '#2563eb', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#38bdf8', '#facc15', '#fb7185', '#4ade80'
      ],
      borderWidth: 2,
      hoverOffset: 16,
    }],
  };
  // By date
  const dateTotals = expenses.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] || 0) + t.amount;
    return acc;
  }, {});
  const sortedDates = Object.keys(dateTotals).sort();
  const dateData = {
    labels: sortedDates.map(formatDate),
    datasets: [{
      label: 'Expenses',
      data: sortedDates.map(d => dateTotals[d]),
      backgroundColor: '#f87171',
      borderRadius: 8,
      maxBarThickness: 36,
    }],
  };

  const handleFileUpload = async () => {
    if (!uploadedFile) return;
    setFileLoading(true);
    setUploadMessage(null);
    
    try {
      const result = await uploadFile(uploadedFile);
      
      if (result.success) {
        if (result.addedTransactions > 0) {
          // Refetch transactions to show the newly added ones
          const updated = await getTransactions({
            from: filter.from,
            to: filter.to,
            page: currentPage,
            limit: itemsPerPage,
          });
          setTransactions(updated.transactions || []);
          setTotalCount(updated.count || 0);
          
          const incomeText = result.incomeTransactions > 0 ? ` (${result.incomeTransactions} income)` : '';
          const expenseText = result.expenseTransactions > 0 ? ` (${result.expenseTransactions} expense)` : '';
          
          setUploadMessage({
            type: 'success',
            title: 'File Upload Successful!',
            message: `${result.addedTransactions} transaction${result.addedTransactions > 1 ? 's' : ''} extracted and added${incomeText}${expenseText}.`
          });
          
          // Auto-clear success message after 5 seconds
          setTimeout(() => {
            setUploadMessage(null);
          }, 5000);
        } else if (result.extractedTransactions > 0) {
          setUploadMessage({
            type: 'warning',
            title: 'Transactions Found But Not Added',
            message: `${result.extractedTransactions} transaction${result.extractedTransactions > 1 ? 's' : ''} were found but couldn't be added to the database. Please try again.`
          });
        } else {
          setUploadMessage({
            type: 'warning',
            title: 'No Transactions Found',
            message: 'File uploaded successfully, but no transactions were extracted. Please check if the file contains valid receipt or transaction data.'
          });
        }
      } else {
        setUploadMessage({
          type: 'error',
          title: 'Upload Failed',
          message: result.message || 'File upload failed. Please try again.'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage({
        type: 'error',
        title: 'Upload Failed',
        message: 'File upload failed. Please check your file format and try again.'
      });
    }
    
    setFileLoading(false);
    setUploadedFile(null);
    setPreviewUrl(null);
  };

  // Pagination logic
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-primary-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Finance Assistant</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{userName}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                icon={FiLogOut}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center animate-slide-up hover:scale-105 transition-transform" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3 animate-float">
                <FiTrendingUp className="w-6 h-6 text-green-600 animate-pulse-slow" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-green-600 animate-scale-in">₹{totalIncome.toLocaleString()}</p>
            </div>
          </Card>
          
          <Card className="text-center animate-slide-up hover:scale-105 transition-transform" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3 animate-float">
                <FiTrendingDown className="w-6 h-6 text-red-600 animate-pulse-slow" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 animate-scale-in">₹{totalExpense.toLocaleString()}</p>
            </div>
          </Card>
          
          <Card className="text-center animate-slide-up hover:scale-105 transition-transform" style={{ animationDelay: '0.3s' }}>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-3 animate-float">
                <FiDollarSign className="w-6 h-6 text-primary-600 animate-pulse-slow" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'} animate-scale-in`}>
                {balance >= 0 ? '+' : '-'}₹{Math.abs(balance).toLocaleString()}
              </p>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button
            onClick={() => setShowOverlay(true)}
            size="lg"
            className="flex-1 animate-slide-up hover:scale-105 transition-transform"
            icon={FiPlus}
            style={{ animationDelay: '0.4s' }}
          >
            Add Transaction
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="flex-1 animate-slide-up hover:scale-105 transition-transform"
            icon={FiUpload}
            onClick={() => fileInputRef.current.click()}
            style={{ animationDelay: '0.5s' }}
          >
            Upload Receipt
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center space-x-2">
              <FiFilter className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Filter by date:</span>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={filter.from}
                onChange={e => setFilter(f => ({ ...f, from: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={filter.to}
                onChange={e => setFilter(f => ({ ...f, to: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Transaction List */}
        <Card className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="itemsPerPage" className="text-sm text-gray-600">Rows per page:</label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading transactions..." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map(t => (
                      <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(t.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {t.type === 'income' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FiTrendingUp className="w-3 h-3 mr-1" />
                              Income
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <FiTrendingDown className="w-3 h-3 mr-1" />
                              Expense
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.category}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${t.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                          {t.type === 'expense' ? '-' : '+'}₹{t.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.note}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(t._id)}
                            loading={deleteLoading === t._id}
                            icon={FiTrash2}
                          >
                            {deleteLoading === t._id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-center items-center mt-6 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage-1)}
              disabled={currentPage === 1 || loading}
              icon={FiChevronLeft}
            >
              Previous
            </Button>
            
            {renderPageButtons()}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage+1)}
              disabled={currentPage === totalPages || loading}
              icon={FiChevronRight}
            >
              Next
            </Button>
          </div>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="animate-slide-up hover:scale-105 transition-transform" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center space-x-2 mb-6">
              <FiActivity className="w-5 h-5 text-primary-600 animate-pulse-slow" />
              <h3 className="text-lg font-bold text-gray-900">Expenses by Category</h3>
            </div>
            <div className="h-64 flex items-center justify-center">
              {categoryData.labels.length > 0 ? (
                <Doughnut
                  data={categoryData}
                  options={{
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 20, font: { size: 12 } } } },
                    cutout: '60%',
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  plugins={[centerTextPlugin]}
                />
              ) : (
                <div className="text-gray-400 text-center animate-pulse">
                  <FiBarChart2 className="w-12 h-12 mx-auto mb-2" />
                  <p>No expense data</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="animate-slide-up hover:scale-105 transition-transform" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center space-x-2 mb-6">
              <FiBarChart2 className="w-5 h-5 text-primary-600 animate-pulse-slow" />
              <h3 className="text-lg font-bold text-gray-900">Expenses by Date</h3>
            </div>
            <div className="h-64 flex items-center justify-center">
              {dateData.labels.length > 0 ? (
                <Bar
                  data={dateData}
                  options={{
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        title: { display: true, text: 'Date', font: { weight: 'bold', size: 12 } },
                        grid: { display: false },
                        ticks: { color: '#6b7280', font: { size: 11 } },
                      },
                      y: {
                        title: { display: true, text: 'Amount (₹)', font: { weight: 'bold', size: 12 } },
                        beginAtZero: true,
                        grid: { color: '#e5e7eb' },
                        ticks: { color: '#6b7280', font: { size: 11 } },
                      }
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              ) : (
                <div className="text-gray-400 text-center animate-pulse">
                  <FiBarChart2 className="w-12 h-12 mx-auto mb-2" />
                  <p>No expense data</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* File Upload */}
        <Card className="animate-slide-up hover:scale-105 transition-transform" style={{ animationDelay: '0.8s' }}>
          <div className="text-center">
            {/* Upload Message */}
            {uploadMessage && (
              <div className="mb-6 animate-scale-in">
                <Message
                  type={uploadMessage.type}
                  title={uploadMessage.title}
                  message={uploadMessage.message}
                  onClose={() => setUploadMessage(null)}
                />
              </div>
            )}
            
            {/* Loading Message */}
            {fileLoading && (
              <div className="mb-6 animate-scale-in">
                <Message
                  type="info"
                  title="Processing File..."
                  message="Please wait while we extract transactions from your file. This may take a few moments."
                />
              </div>
            )}
            
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 cursor-pointer group"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current.click()}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4 group-hover:text-primary-500 group-hover:scale-110 transition-all duration-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">Upload Receipt or Transaction PDF</h3>
              <p className="text-gray-500 group-hover:text-gray-600 transition-colors">Drag and drop or click to select (Image or PDF)</p>
            </div>

            {uploadedFile && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg animate-scale-in">
                <div className="flex items-center space-x-4">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-16 h-16 object-contain rounded-lg border hover:scale-110 transition-transform" />
                  ) : (
                    <FiFileText className="w-16 h-16 text-gray-400 hover:scale-110 transition-transform" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">{(uploadedFile.size/1024).toFixed(1)} KB</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleFileUpload}
                      loading={fileLoading}
                      icon={FiUpload}
                      className="hover:scale-105 transition-transform"
                    >
                      {fileLoading ? 'Uploading...' : 'Upload'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadedFile(null);
                        setPreviewUrl(null);
                        setUploadMessage(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      disabled={fileLoading}
                      className="hover:scale-105 transition-transform"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Overlay for Add Transaction Form */}
        <Overlay open={showOverlay} onClose={() => setShowOverlay(false)}>
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add Transaction</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <input
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Category"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  name="amount"
                  type="number"
                  value={form.amount}
                  onChange={handleFormChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                  required
                />
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleFormChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <input
                name="note"
                value={form.note}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Note (optional)"
              />
              <Button
                type="submit"
                loading={addLoading}
                className="w-full"
                size="lg"
              >
                {addLoading ? 'Adding...' : 'Add Transaction'}
              </Button>
            </form>
          </Card>
        </Overlay>
      </div>
    </div>
  );
}

export default Dashboard; 