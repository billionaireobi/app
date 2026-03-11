"""
Quick API Test Script
Test the API endpoints to verify setup
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

# Test configuration
TEST_USERNAME = "your_test_username"
TEST_PASSWORD = "your_test_password"

def print_response(title, response):
    """Pretty print API response"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)

def test_login():
    """Test login endpoint"""
    url = f"{BASE_URL}/auth/login/"
    data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(url, json=data)
    print_response("TEST: Login", response)
    
    if response.status_code == 200:
        return response.json().get('token')
    return None

def test_products(token):
    """Test products list endpoint"""
    url = f"{BASE_URL}/products/"
    headers = {"Authorization": f"Token {token}"}
    
    response = requests.get(url, headers=headers)
    print_response("TEST: List Products", response)

def test_customers(token):
    """Test customers list endpoint"""
    url = f"{BASE_URL}/customers/"
    headers = {"Authorization": f"Token {token}"}
    
    response = requests.get(url, headers=headers)
    print_response("TEST: List Customers", response)

def test_orders(token):
    """Test orders list endpoint"""
    url = f"{BASE_URL}/orders/"
    headers = {"Authorization": f"Token {token}"}
    
    response = requests.get(url, headers=headers)
    print_response("TEST: List Orders", response)

def test_user_profile(token):
    """Test user profile endpoint"""
    url = f"{BASE_URL}/users/profile/me/"
    headers = {"Authorization": f"Token {token}"}
    
    response = requests.get(url, headers=headers)
    print_response("TEST: User Profile", response)

def run_all_tests():
    """Run all API tests"""
    print("\n" + "="*60)
    print("ZELIA API TEST SUITE")
    print("="*60)
    
    # Test login
    token = test_login()
    
    if not token:
        print("\n[ERROR] Login failed. Cannot proceed with tests.")
        return
    
    print(f"\n[SUCCESS] Token: {token[:20]}...")
    
    # Test other endpoints
    test_user_profile(token)
    test_products(token)
    test_customers(token)
    test_orders(token)
    
    print("\n" + "="*60)
    print("TESTS COMPLETED")
    print("="*60)

if __name__ == "__main__":
    print("""
    Before running tests, please:
    1. Start the Django development server: python manage.py runserver
    2. Update TEST_USERNAME and TEST_PASSWORD with valid credentials
    3. Run this script
    """)
    
    input("Press Enter to start tests...")
    run_all_tests()
