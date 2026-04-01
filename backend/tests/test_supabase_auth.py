"""
Backend API Tests for Supabase Auth Integration
Tests: Auth verification, auto-user creation, CRUD with Supabase tokens
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gig-tracker-hub.preview.emergentagent.com')

# Supabase credentials from environment
SUPABASE_URL = os.environ.get('SUPABASE_URL', os.environ.get('REACT_APP_SUPABASE_URL', ''))
SUPABASE_KEY = os.environ.get('SUPABASE_PUBLISHABLE_KEY', os.environ.get('REACT_APP_SUPABASE_PUBLISHABLE_KEY', ''))

# Test accounts from environment
EXISTING_USER = {"email": os.environ.get('TEST_USER_EMAIL', ''), "password": os.environ.get('TEST_USER_PASSWORD', '')}
NEW_USER = {"email": f"tester_{int(time.time())}@gigspro.com", "password": os.environ.get('TEST_USER_PASSWORD', 'changeme'), "name": "Test Driver"}


class TestSupabaseAuth:
    """Test Supabase Auth integration with backend"""
    
    @pytest.fixture(scope="class")
    def supabase_session(self):
        """Get Supabase session for existing user"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": EXISTING_USER["email"],
                "password": EXISTING_USER["password"]
            }
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        pytest.skip(f"Could not get Supabase session: {response.status_code} - {response.text}")
    
    def test_01_supabase_signin_returns_token(self):
        """Test that Supabase sign-in returns an access token"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": EXISTING_USER["email"],
                "password": EXISTING_USER["password"]
            }
        )
        print(f"Supabase signin response: {response.status_code}")
        
        # Check status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check data
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        assert data["user"]["email"] == EXISTING_USER["email"]
        print(f"SUCCESS: Got access token for {EXISTING_USER['email']}")
    
    def test_02_backend_auth_me_with_supabase_token(self, supabase_session):
        """Test that backend /api/auth/me accepts Supabase tokens"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {supabase_session}"}
        )
        print(f"Backend /api/auth/me response: {response.status_code}")
        
        # Check status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check data
        data = response.json()
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        assert data["email"] == EXISTING_USER["email"]
        print(f"SUCCESS: Backend verified Supabase token for {data['email']}")
    
    def test_03_backend_rejects_invalid_token(self):
        """Test that backend rejects invalid tokens"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        print(f"Backend response for invalid token: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Backend correctly rejects invalid tokens")
    
    def test_04_backend_rejects_no_token(self):
        """Test that backend rejects requests without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        print(f"Backend response for no token: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Backend correctly rejects requests without token")
    
    def test_05_invalid_credentials_error(self):
        """Test that Supabase returns error for invalid credentials"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": "wrong@example.com",
                "password": "wrongpassword"
            }
        )
        print(f"Supabase response for invalid credentials: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("SUCCESS: Supabase correctly rejects invalid credentials")


class TestCRUDWithSupabaseAuth:
    """Test CRUD operations with Supabase Auth tokens"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers with Supabase token"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": EXISTING_USER["email"],
                "password": EXISTING_USER["password"]
            }
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        pytest.skip("Could not get auth token")
    
    def test_01_get_companies(self, auth_headers):
        """Test GET /api/companies with Supabase token"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        print(f"GET /api/companies: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} companies")
    
    def test_02_create_company(self, auth_headers):
        """Test POST /api/companies with Supabase token"""
        company_data = {
            "name": f"TEST_Company_{int(time.time())}",
            "website": "https://test.com",
            "status": "Researching",
            "priority": "Medium",
            "handler": "Unassigned"
        }
        response = requests.post(
            f"{BASE_URL}/api/companies",
            headers=auth_headers,
            json=company_data
        )
        print(f"POST /api/companies: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == company_data["name"]
        assert "id" in data
        print(f"SUCCESS: Created company {data['name']} with id {data['id']}")
        
        # Store for cleanup
        self.__class__.created_company_id = data["id"]
    
    def test_03_get_company_by_id(self, auth_headers):
        """Test GET /api/companies/{id} with Supabase token"""
        company_id = getattr(self.__class__, 'created_company_id', None)
        if not company_id:
            pytest.skip("No company created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/companies/{company_id}",
            headers=auth_headers
        )
        print(f"GET /api/companies/{company_id}: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == company_id
        print(f"SUCCESS: Retrieved company {data['name']}")
    
    def test_04_update_company(self, auth_headers):
        """Test PUT /api/companies/{id} with Supabase token"""
        company_id = getattr(self.__class__, 'created_company_id', None)
        if not company_id:
            pytest.skip("No company created in previous test")
        
        update_data = {"notes": f"Updated at {time.time()}"}
        response = requests.put(
            f"{BASE_URL}/api/companies/{company_id}",
            headers=auth_headers,
            json=update_data
        )
        print(f"PUT /api/companies/{company_id}: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert update_data["notes"] in data["notes"]
        print(f"SUCCESS: Updated company notes")
    
    def test_05_create_activity(self, auth_headers):
        """Test POST /api/activities with Supabase token"""
        company_id = getattr(self.__class__, 'created_company_id', None)
        if not company_id:
            pytest.skip("No company created in previous test")
        
        activity_data = {
            "company_id": company_id,
            "company_name": "TEST_Company",
            "type": "Email",
            "outcome": "Pending",
            "handler": "Unassigned",
            "notes": "Test activity"
        }
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=auth_headers,
            json=activity_data
        )
        print(f"POST /api/activities: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"SUCCESS: Created activity with id {data['id']}")
    
    def test_06_get_activities(self, auth_headers):
        """Test GET /api/activities with Supabase token"""
        response = requests.get(f"{BASE_URL}/api/activities", headers=auth_headers)
        print(f"GET /api/activities: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} activities")
    
    def test_07_get_dashboard(self, auth_headers):
        """Test GET /api/dashboard with Supabase token"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=auth_headers)
        print(f"GET /api/dashboard: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_companies" in data
        assert "active_gigs" in data
        print(f"SUCCESS: Dashboard shows {data['total_companies']} total companies")
    
    def test_08_get_handlers(self, auth_headers):
        """Test GET /api/settings/handlers with Supabase token"""
        response = requests.get(f"{BASE_URL}/api/settings/handlers", headers=auth_headers)
        print(f"GET /api/settings/handlers: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got handlers: {data}")
    
    def test_09_seed_data(self, auth_headers):
        """Test POST /api/seed with Supabase token"""
        response = requests.post(f"{BASE_URL}/api/seed", headers=auth_headers)
        print(f"POST /api/seed: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: Seed response: {data['message']}")
    
    def test_10_delete_company(self, auth_headers):
        """Test DELETE /api/companies/{id} with Supabase token - cleanup"""
        company_id = getattr(self.__class__, 'created_company_id', None)
        if not company_id:
            pytest.skip("No company to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/companies/{company_id}",
            headers=auth_headers
        )
        print(f"DELETE /api/companies/{company_id}: {response.status_code}")
        
        assert response.status_code == 200
        print(f"SUCCESS: Deleted test company")


class TestSupabaseSignUp:
    """Test Supabase Sign-Up flow (creates new user)"""
    
    def test_01_signup_creates_user(self):
        """Test that Supabase sign-up creates a new user"""
        # Use unique email to avoid conflicts
        unique_email = f"test_signup_{int(time.time())}@gigspro.com"
        
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": unique_email,
                "password": "TestPass123!",
                "data": {"full_name": "Test Signup User"}
            }
        )
        print(f"Supabase signup response: {response.status_code}")
        
        # Supabase returns 200 for signup
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check if user was created
        assert "user" in data or "id" in data, "Response should contain user data"
        
        # If email confirmation is disabled, we should get a session
        if "access_token" in data:
            print(f"SUCCESS: Sign-up returned session (email confirmation disabled)")
            # Test that backend accepts this token
            me_response = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {data['access_token']}"}
            )
            assert me_response.status_code == 200, "Backend should accept new user's token"
            me_data = me_response.json()
            assert me_data["email"] == unique_email
            print(f"SUCCESS: Backend auto-created user profile for {unique_email}")
        else:
            print(f"INFO: Sign-up requires email confirmation")


class TestLogout:
    """Test logout functionality"""
    
    def test_01_logout_clears_session(self):
        """Test that logout endpoint works"""
        # First get a token
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": EXISTING_USER["email"],
                "password": EXISTING_USER["password"]
            }
        )
        if response.status_code != 200:
            pytest.skip("Could not get token for logout test")
        
        token = response.json().get("access_token")
        
        # Call logout endpoint
        logout_response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"POST /api/auth/logout: {logout_response.status_code}")
        
        assert logout_response.status_code == 200
        data = logout_response.json()
        assert "message" in data
        print(f"SUCCESS: Logout returned: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
