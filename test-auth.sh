#!/bin/bash

echo "🧪 Testing Authentication Flow..."

# Check if server is running
echo "1. Checking if server is running..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Server is not running on localhost:3000"
    exit 1
fi
echo "✅ Server is running"

# Test login API
echo ""
echo "2. Testing login API..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Bala","password":"Avenir@9669"}' \
  -c cookies.txt \
  -w "%{http_code}")

if [[ $LOGIN_RESPONSE == *"200"* ]]; then
    echo "✅ Login API returns 200"
else
    echo "❌ Login API failed. Response: $LOGIN_RESPONSE"
    exit 1
fi

# Check if cookie was set
echo ""
echo "3. Checking if auth cookie was set..."
if grep -q "auth-token" cookies.txt; then
    echo "✅ Auth cookie was set"
else
    echo "❌ Auth cookie was not set"
    cat cookies.txt
    exit 1
fi

# Test auth verification
echo ""
echo "4. Testing auth verification..."
AUTH_RESPONSE=$(curl -s http://localhost:3000/api/auth/me \
  -b cookies.txt \
  -w "%{http_code}")

if [[ $AUTH_RESPONSE == *"200"* ]]; then
    echo "✅ Auth verification successful"
else
    echo "❌ Auth verification failed. Response: $AUTH_RESPONSE"
    exit 1
fi

# Test accessing protected route
echo ""
echo "5. Testing access to /customers..."
CUSTOMERS_RESPONSE=$(curl -s http://localhost:3000/customers \
  -b cookies.txt \
  -w "%{http_code}" \
  -o /dev/null)

if [[ $CUSTOMERS_RESPONSE == "200" ]]; then
    echo "✅ /customers page accessible with auth"
else
    echo "❌ /customers page not accessible. Response code: $CUSTOMERS_RESPONSE"
    exit 1
fi

echo ""
echo "🎉 All authentication tests passed!"
echo "✅ Login API works"
echo "✅ Cookies are set properly"
echo "✅ Auth verification works"
echo "✅ Protected routes are accessible"

# Cleanup
rm -f cookies.txt