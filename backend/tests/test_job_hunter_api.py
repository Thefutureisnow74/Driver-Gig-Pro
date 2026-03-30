"""
Test AI Job Hunter API endpoints
Tests: generate-keywords, search-jobs, draft-outreach, auto-pilot
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gig-tracker-hub.preview.emergentagent.com')

class TestJobHunterAPI:
    """AI Job Hunter endpoint tests"""
    
    def test_generate_keywords_endpoint(self):
        """Test POST /api/ai/generate-keywords returns keywords"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-keywords",
            json={
                "service_types": ["Food Delivery", "Package Delivery"],
                "vehicles": ["Car", "SUV"],
                "states": ["TX", "CA"],
                "sources": ["Indeed", "Craigslist"]
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check response structure
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, f"Expected success=True, got {data.get('success')}"
        assert "data" in data, "Response should have 'data' field"
        
        # Check data structure
        result_data = data["data"]
        assert "keywords" in result_data, "Data should have 'keywords' array"
        assert isinstance(result_data["keywords"], list), "Keywords should be a list"
        assert len(result_data["keywords"]) > 0, "Keywords list should not be empty"
        
        print(f"SUCCESS: Generated {len(result_data['keywords'])} keywords")
        print(f"Keywords: {result_data['keywords'][:5]}...")
    
    def test_search_jobs_endpoint(self):
        """Test POST /api/ai/search-jobs returns job results"""
        response = requests.post(
            f"{BASE_URL}/api/ai/search-jobs",
            json={
                "service_types": ["Food Delivery"],
                "vehicles": ["Car"],
                "states": ["TX"],
                "sources": ["Indeed", "Craigslist"],
                "keywords": "delivery driver gig"
            },
            headers={"Content-Type": "application/json"},
            timeout=60  # AI endpoints can take longer
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check response structure
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, f"Expected success=True, got {data.get('success')}"
        assert "data" in data, "Response should have 'data' field"
        
        # Check data structure
        result_data = data["data"]
        assert "results" in result_data, "Data should have 'results' array"
        assert isinstance(result_data["results"], list), "Results should be a list"
        
        if len(result_data["results"]) > 0:
            job = result_data["results"][0]
            # Check job structure
            assert "id" in job, "Job should have 'id'"
            assert "title" in job, "Job should have 'title'"
            assert "company" in job, "Job should have 'company'"
            assert "source" in job, "Job should have 'source'"
            print(f"SUCCESS: Found {len(result_data['results'])} job results")
            print(f"First job: {job.get('title')} at {job.get('company')}")
        else:
            print("INFO: No job results returned (may be expected)")
        
        # Check searchUrls
        if "searchUrls" in result_data:
            assert isinstance(result_data["searchUrls"], dict), "searchUrls should be a dict"
            print(f"Search URLs: {list(result_data['searchUrls'].keys())}")
    
    def test_draft_outreach_endpoint(self):
        """Test POST /api/ai/draft-outreach returns draft email"""
        response = requests.post(
            f"{BASE_URL}/api/ai/draft-outreach",
            json={
                "job": {
                    "id": "test_job_1",
                    "title": "Delivery Driver",
                    "company": "Test Company",
                    "description": "Looking for reliable delivery drivers",
                    "location": "Dallas, TX",
                    "payEstimate": "$20-25/hr",
                    "requirements": ["Valid license", "Own vehicle"]
                },
                "user_name": "King Solomon",
                "user_info": "Experienced gig driver with 5 years experience",
                "type": "email"
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check response structure
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, f"Expected success=True, got {data.get('success')}"
        assert "data" in data, "Response should have 'data' field"
        
        # Check outreach structure
        outreach = data["data"]
        assert "subject" in outreach, "Outreach should have 'subject'"
        assert "body" in outreach, "Outreach should have 'body'"
        assert len(outreach["subject"]) > 0, "Subject should not be empty"
        assert len(outreach["body"]) > 0, "Body should not be empty"
        
        print(f"SUCCESS: Generated outreach email")
        print(f"Subject: {outreach['subject'][:50]}...")
    
    def test_auto_pilot_endpoint(self):
        """Test POST /api/ai/auto-pilot returns results with outreach"""
        response = requests.post(
            f"{BASE_URL}/api/ai/auto-pilot",
            json={
                "service_types": ["Food Delivery"],
                "vehicles": ["Car"],
                "states": ["TX"],
                "sources": ["Indeed"],
                "user_name": "King Solomon",
                "user_info": "Experienced driver"
            },
            headers={"Content-Type": "application/json"},
            timeout=90  # Auto-pilot takes longer
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check response structure
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, f"Expected success=True, got {data.get('success')}"
        assert "data" in data, "Response should have 'data' field"
        
        # Check data structure
        result_data = data["data"]
        assert "results" in result_data, "Data should have 'results' array"
        
        if len(result_data["results"]) > 0:
            job = result_data["results"][0]
            # Auto-pilot should include outreach
            if "outreach" in job:
                assert "subject" in job["outreach"], "Outreach should have subject"
                assert "body" in job["outreach"], "Outreach should have body"
                print(f"SUCCESS: Auto-pilot returned {len(result_data['results'])} jobs with outreach")
            else:
                print(f"INFO: Auto-pilot returned {len(result_data['results'])} jobs (outreach may be separate)")
        else:
            print("INFO: No auto-pilot results returned")


class TestJobHunterAPIEdgeCases:
    """Edge case tests for Job Hunter API"""
    
    def test_generate_keywords_empty_params(self):
        """Test generate-keywords with empty parameters"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-keywords",
            json={
                "service_types": [],
                "vehicles": [],
                "states": [],
                "sources": []
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should still return 200 with default keywords
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "success" in data
        print(f"SUCCESS: Empty params handled - success={data.get('success')}")
    
    def test_search_jobs_no_sources(self):
        """Test search-jobs with no sources selected"""
        response = requests.post(
            f"{BASE_URL}/api/ai/search-jobs",
            json={
                "service_types": ["Food Delivery"],
                "vehicles": ["Car"],
                "states": ["TX"],
                "sources": [],
                "keywords": ""
            },
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"SUCCESS: No sources handled - success={data.get('success')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
