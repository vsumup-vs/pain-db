import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import OrganizationSelector from '../components/OrganizationSelector';
import { api } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [availableOrgs, setAvailableOrgs] = useState([]);
  const [tempToken, setTempToken] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if organization selection is required
        if (data.requiresOrganizationSelection) {
          setAvailableOrgs(data.availableOrganizations);
          setTempToken(data.token);
          setShowOrgSelector(true);
        } else {
          // Store the token
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          toast.success('Login successful!');
          navigate('/');
        }
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setIsLoading(true);
    
    try {
      // Create a test user first
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User'
        }),
      });

      if (registerResponse.ok || registerResponse.status === 409) {
        // User exists or was created, now try to login
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'TestPass123!'
          }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok) {
          localStorage.setItem('authToken', loginData.token);
          localStorage.setItem('user', JSON.stringify(loginData.user));
          
          toast.success('Test login successful!');
          navigate('/');
        } else {
          toast.error(loginData.error || 'Test login failed');
        }
      } else {
        const registerData = await registerResponse.json();
        toast.error(registerData.error || 'Failed to create test user');
      }
    } catch (error) {
      console.error('Test login error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationSelect = async (organizationId) => {
    try {
      setIsLoading(true);

      // Set temp token for API call
      localStorage.setItem('authToken', tempToken);

      const response = await api.selectOrganization(organizationId);

      // Store the new token with organization context
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.organization));

      toast.success(`Logged into ${response.organization.name}`);
      navigate('/');
    } catch (error) {
      console.error('Organization selection error:', error);
      toast.error('Failed to select organization');
      setIsLoading(false);
    }
  };

  if (showOrgSelector) {
    return (
      <OrganizationSelector
        organizations={availableOrgs}
        onSelect={handleOrganizationSelect}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Pain Management Platform
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Test the authentication system
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={handleTestLogin}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Creating test user...' : 'Quick Test Login'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Test credentials: test@example.com / TestPass123!
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;