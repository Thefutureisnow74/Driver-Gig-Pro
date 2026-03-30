"""
Backend API Tests for Driver Gig CRM
Tests: Auth, Companies CRUD, Activities, Dashboard, Settings, Seed Data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gig-tracker-hub.preview.emergentagent.com')

# Test credentials from environment
TEST_EMAIL = os.environ.get('TEST_USER_EMAIL', '')
TEST_PASSWORD = os.environ.get('TEST_USER_PASSWORD', '')

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_auth_me(self, auth_token):
        """Test /auth/me endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        print(f"✓ Auth/me returned user: {data['email']}")


class TestCompanies:
    """Company CRUD tests"""
    
    def test_get_companies(self, auth_token):
        """Test getting all companies"""
        response = requests.get(f"{BASE_URL}/api/companies", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Get companies failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of companies"
        print(f"✓ Got {len(data)} companies")
        return data
    
    def test_create_company(self, auth_token):
        """Test creating a new company"""
        new_company = {
            "name": "TEST_Company_" + str(os.urandom(4).hex()),
            "website": "https://test.com",
            "status": "Researching",
            "priority": "Medium",
            "handler": "King Solomon",
            "service_type": ["Food Delivery"],
            "vehicles": ["Car"],
            "work_model": ["App / On Demand"],
            "active_states": ["TX"]
        }
        response = requests.post(f"{BASE_URL}/api/companies", json=new_company, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Create company failed: {response.text}"
        data = response.json()
        assert data["name"] == new_company["name"]
        assert "id" in data
        print(f"✓ Created company: {data['name']} (id: {data['id']})")
        return data
    
    def test_update_company(self, auth_token):
        """Test updating a company"""
        # First create a company
        new_company = {
            "name": "TEST_Update_" + str(os.urandom(4).hex()),
            "status": "Researching",
            "priority": "Low"
        }
        create_resp = requests.post(f"{BASE_URL}/api/companies", json=new_company, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert create_resp.status_code == 200
        company_id = create_resp.json()["id"]
        
        # Update the company
        update_data = {"status": "Applied", "priority": "High"}
        update_resp = requests.put(f"{BASE_URL}/api/companies/{company_id}", json=update_data, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated["status"] == "Applied"
        assert updated["priority"] == "High"
        
        # Verify persistence with GET
        get_resp = requests.get(f"{BASE_URL}/api/companies/{company_id}", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["status"] == "Applied"
        print(f"✓ Updated and verified company: {company_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/companies/{company_id}", headers={
            "Authorization": f"Bearer {auth_token}"
        })
    
    def test_delete_company(self, auth_token):
        """Test deleting a company"""
        # Create a company to delete
        new_company = {"name": "TEST_Delete_" + str(os.urandom(4).hex()), "status": "Researching"}
        create_resp = requests.post(f"{BASE_URL}/api/companies", json=new_company, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        company_id = create_resp.json()["id"]
        
        # Delete it
        delete_resp = requests.delete(f"{BASE_URL}/api/companies/{company_id}", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/companies/{company_id}", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert get_resp.status_code == 404, "Company should be deleted"
        print(f"✓ Deleted company: {company_id}")


class TestActivities:
    """Activity endpoint tests"""
    
    def test_get_activities(self, auth_token):
        """Test getting all activities"""
        response = requests.get(f"{BASE_URL}/api/activities", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Get activities failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} activities")
    
    def test_create_activity(self, auth_token):
        """Test creating an activity"""
        # Get a company first
        companies_resp = requests.get(f"{BASE_URL}/api/companies", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        companies = companies_resp.json()
        if not companies:
            pytest.skip("No companies to create activity for")
        
        company = companies[0]
        activity = {
            "company_id": company["id"],
            "company_name": company["name"],
            "type": "Phone",
            "outcome": "Interested",
            "handler": "King Solomon",
            "notes": "TEST activity - can be deleted"
        }
        response = requests.post(f"{BASE_URL}/api/activities", json=activity, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Create activity failed: {response.text}"
        data = response.json()
        assert data["company_name"] == company["name"]
        print(f"✓ Created activity for {company['name']}")


class TestDashboard:
    """Dashboard endpoint tests"""
    
    def test_get_dashboard(self, auth_token):
        """Test dashboard data"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        assert "totalCompanies" in data or "total_companies" in data
        print(f"✓ Dashboard data retrieved")


class TestSettings:
    """Settings endpoint tests"""
    
    def test_get_handlers(self, auth_token):
        """Test getting handlers"""
        response = requests.get(f"{BASE_URL}/api/settings/handlers", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Get handlers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got handlers: {data}")
    
    def test_get_profile(self, auth_token):
        """Test getting profile"""
        response = requests.get(f"{BASE_URL}/api/settings/profile", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Get profile failed: {response.text}"
        data = response.json()
        assert "email" in data
        print(f"✓ Got profile for: {data['email']}")


class TestSeedData:
    """Seed data endpoint tests"""
    
    def test_seed_endpoint_exists(self, auth_token):
        """Test seed endpoint returns proper response"""
        response = requests.post(f"{BASE_URL}/api/seed", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        # Should return 200 whether data exists or not
        assert response.status_code == 200, f"Seed failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Seed endpoint response: {data['message']}")


# Fixtures
@pytest.fixture(scope="session")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Could not authenticate: {response.text}")
    return response.json()["token"]


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data(auth_token):
    """Cleanup TEST_ prefixed companies after all tests"""
    yield
    # Cleanup
    response = requests.get(f"{BASE_URL}/api/companies", headers={
        "Authorization": f"Bearer {auth_token}"
    })
    if response.status_code == 200:
        companies = response.json()
        for company in companies:
            if company.get("name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/companies/{company['id']}", headers={
                    "Authorization": f"Bearer {auth_token}"
                })
                print(f"Cleaned up: {company['name']}")
