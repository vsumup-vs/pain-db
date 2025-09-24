#!/bin/bash

# Pain Management Platform - Frontend Setup Script
echo "🚀 Setting up Pain Management Platform Frontend..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the pain-db root directory"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: Frontend directory not found"
    exit 1
fi

cd frontend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: Frontend package.json not found"
    exit 1
fi

# Install dependencies
echo "📥 Installing frontend dependencies..."
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed successfully!"
else
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

# Create postcss.config.js if it doesn't exist
if [ ! -f "postcss.config.js" ]; then
    echo "🎨 Creating PostCSS configuration..."
    cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
fi

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start the backend server:"
echo "   npm run dev"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open your browser to:"
echo "   Frontend: http://localhost:3001"
echo "   Backend API: http://localhost:3000"
echo ""
echo "🎉 Happy coding!"