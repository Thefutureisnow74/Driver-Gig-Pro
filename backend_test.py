#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class DriverGigCRMTester:
    def __init__(self, base_url="https://gig-tracker-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.company_id = None
        self.activity_id = None
        self.earning_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register(self):
        """Test user registration"""
        test_email = f"test@newuser.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"email": test_email, "password": "Test123!", "name": "New User"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['user_id']
            print(f"   Registered user: {test_email}")
            return True
        return False

    def test_login(self):
        """Test user login with existing credentials"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": "test@example.com", "password": "Test123!"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['user_id']
            print(f"   Logged in user: {response['user']['email']}")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard(self):
        """Test dashboard endpoint"""
        success, response = self.run_test(
            "Dashboard Data",
            "GET",
            "dashboard",
            200
        )
        if success:
            required_fields = ['total_companies', 'active_gigs', 'applications_pending', 'overdue_followups']
            for field in required_fields:
                if field not in response:
                    print(f"   Warning: Missing field {field} in dashboard response")
        return success

    def test_companies_crud(self):
        """Test companies CRUD operations"""
        # Get companies
        success, companies = self.run_test(
            "Get Companies",
            "GET",
            "companies",
            200
        )
        if not success:
            return False

        print(f"   Found {len(companies)} companies")

        # Create company
        company_data = {
            "name": "Test Company",
            "website": "https://test.com",
            "main_phone": "555-0123",
            "active_states": ["TX", "CA"],
            "work_model": ["App / On Demand"],
            "service_type": ["Food Delivery"],
            "vehicles": ["Car"],
            "status": "Researching",
            "priority": "Medium",
            "handler": "Test Handler",
            "notes": "Test company for API testing"
        }
        
        success, response = self.run_test(
            "Create Company",
            "POST",
            "companies",
            200,
            data=company_data
        )
        if success and 'id' in response:
            self.company_id = response['id']
            print(f"   Created company with ID: {self.company_id}")
        else:
            return False

        # Get specific company
        success, company = self.run_test(
            "Get Specific Company",
            "GET",
            f"companies/{self.company_id}",
            200
        )
        if not success:
            return False

        # Update company
        update_data = {"status": "Applied", "priority": "High"}
        success, updated = self.run_test(
            "Update Company",
            "PUT",
            f"companies/{self.company_id}",
            200,
            data=update_data
        )
        if success:
            print(f"   Updated company status to: {updated.get('status', 'Unknown')}")

        return success

    def test_activities_crud(self):
        """Test activities CRUD operations"""
        if not self.company_id:
            print("   Skipping activities test - no company ID available")
            return False

        # Get activities
        success, activities = self.run_test(
            "Get Activities",
            "GET",
            "activities",
            200
        )
        if not success:
            return False

        print(f"   Found {len(activities)} activities")

        # Create activity
        activity_data = {
            "company_id": self.company_id,
            "company_name": "Test Company",
            "type": "Email",
            "outcome": "Interested",
            "handler": "Test Handler",
            "notes": "Test activity for API testing",
            "next_action": "Follow up next week"
        }
        
        success, response = self.run_test(
            "Create Activity",
            "POST",
            "activities",
            200,
            data=activity_data
        )
        if success and 'id' in response:
            self.activity_id = response['id']
            print(f"   Created activity with ID: {self.activity_id}")

        # Get company activities
        success, company_activities = self.run_test(
            "Get Company Activities",
            "GET",
            f"activities/company/{self.company_id}",
            200
        )
        if success:
            print(f"   Found {len(company_activities)} activities for company")

        return success

    def test_earnings_crud(self):
        """Test earnings CRUD operations"""
        if not self.company_id:
            print("   Skipping earnings test - no company ID available")
            return False

        # Get earnings
        success, earnings = self.run_test(
            "Get Earnings",
            "GET",
            "earnings",
            200
        )
        if not success:
            return False

        print(f"   Found {len(earnings)} earnings entries")

        # Create earning
        earning_data = {
            "company_id": self.company_id,
            "company_name": "Test Company",
            "date": "2025-01-15",
            "hours": 8.0,
            "miles": 120.5,
            "gross_earnings": 180.00,
            "tips": 45.00,
            "platform_fees": 15.00,
            "net_earnings": 210.00,
            "notes": "Test earning entry"
        }
        
        success, response = self.run_test(
            "Create Earning",
            "POST",
            "earnings",
            200,
            data=earning_data
        )
        if success and 'id' in response:
            self.earning_id = response['id']
            print(f"   Created earning with ID: {self.earning_id}")

        # Get earnings summary
        success, summary = self.run_test(
            "Get Earnings Summary",
            "GET",
            "earnings/summary",
            200
        )
        if success:
            print(f"   Earnings summary - Weekly: ${summary.get('weekly', 0)}, Monthly: ${summary.get('monthly', 0)}")

        return success

    def test_settings(self):
        """Test settings endpoints"""
        # Get handlers
        success, handlers = self.run_test(
            "Get Handlers",
            "GET",
            "settings/handlers",
            200
        )
        if not success:
            return False

        print(f"   Found handlers: {handlers}")

        # Update handlers
        new_handlers = ["King Solomon", "Sarah", "Test Handler", "Unassigned"]
        success, updated_handlers = self.run_test(
            "Update Handlers",
            "PUT",
            "settings/handlers",
            200,
            data={"handlers": new_handlers}
        )
        if success:
            print(f"   Updated handlers: {updated_handlers}")

        # Get profile
        success, profile = self.run_test(
            "Get Profile",
            "GET",
            "settings/profile",
            200
        )
        if success:
            print(f"   Profile: {profile.get('name', 'Unknown')} ({profile.get('email', 'No email')})")

        return success

    def test_ai_recommendation(self):
        """Test AI recommendation endpoint"""
        if not self.company_id:
            print("   Skipping AI recommendation test - no company ID available")
            return False

        recommendation_data = {
            "name": "Test Company",
            "status": "Applied",
            "priority": "High",
            "handler": "Test Handler",
            "follow_up_date": "2025-01-20",
            "service_type": ["Food Delivery"],
            "work_model": ["App / On Demand"],
            "contact_name": "John Doe",
            "notes": "Interested in DFW area"
        }
        
        success, response = self.run_test(
            "AI Recommendation",
            "POST",
            "ai/recommendation",
            200,
            data=recommendation_data
        )
        if success:
            recommendation = response.get('recommendation', 'No recommendation')
            print(f"   AI Recommendation: {recommendation[:100]}...")

        return success

    def test_seed_data(self):
        """Test seed data endpoint"""
        success, response = self.run_test(
            "Seed Data",
            "POST",
            "seed",
            200
        )
        if success:
            print(f"   Seed response: {response.get('message', 'No message')}")

        return success

    def test_export_endpoints(self):
        """Test export endpoints"""
        # Export companies
        success, companies_export = self.run_test(
            "Export Companies",
            "GET",
            "export/companies",
            200
        )
        if success:
            print(f"   Exported {len(companies_export)} companies")

        # Export activities
        success2, activities_export = self.run_test(
            "Export Activities",
            "GET",
            "export/activities",
            200
        )
        if success2:
            print(f"   Exported {len(activities_export)} activities")

        return success and success2

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete test earning
        if self.earning_id:
            self.run_test("Delete Test Earning", "DELETE", f"earnings/{self.earning_id}", 200)
        
        # Delete test company (this will also delete related activities)
        if self.company_id:
            self.run_test("Delete Test Company", "DELETE", f"companies/{self.company_id}", 200)

def main():
    print("🚀 Starting Driver Gig CRM Backend API Tests")
    print("=" * 60)
    
    tester = DriverGigCRMTester()
    
    # Test authentication first
    print("\n📋 Testing Authentication...")
    if not tester.test_login():
        print("❌ Login failed, trying registration...")
        if not tester.test_register():
            print("❌ Both login and registration failed, stopping tests")
            return 1
    
    if not tester.test_auth_me():
        print("❌ Auth verification failed, stopping tests")
        return 1

    # Test core functionality
    print("\n📋 Testing Core Functionality...")
    tests = [
        ("Dashboard", tester.test_dashboard),
        ("Companies CRUD", tester.test_companies_crud),
        ("Activities CRUD", tester.test_activities_crud),
        ("Earnings CRUD", tester.test_earnings_crud),
        ("Settings", tester.test_settings),
        ("AI Recommendation", tester.test_ai_recommendation),
        ("Seed Data", tester.test_seed_data),
        ("Export Endpoints", tester.test_export_endpoints),
    ]

    for test_name, test_func in tests:
        print(f"\n📋 Testing {test_name}...")
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")

    # Cleanup
    tester.cleanup()

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("✅ Backend API tests mostly successful!")
        return 0
    else:
        print("❌ Backend API tests failed - multiple issues detected")
        return 1

if __name__ == "__main__":
    sys.exit(main())