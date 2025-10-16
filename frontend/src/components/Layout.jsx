import React, { useState, useEffect, Fragment } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Transition } from '@headlessui/react'
import { api } from '../services/api'
import {
  HomeIcon,
  UserGroupIcon,
  UserIcon,
  ChartBarIcon,
  DocumentTextIcon,
  EyeIcon,
  BellIcon,
  FireIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingOfficeIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

// Platform Configuration (Platform Admin only)
const platformNavigation = [
  { name: 'Organizations', href: '/admin/organizations', icon: BuildingOfficeIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Condition Presets', href: '/condition-presets', icon: ClipboardDocumentCheckIcon },
  { name: 'Metric Definitions', href: '/metric-definitions', icon: ChartBarIcon },
  { name: 'Assessment Templates', href: '/assessment-templates', icon: DocumentTextIcon },
  { name: 'Alert Rules', href: '/alert-rules', icon: ShieldCheckIcon },
]

// Clinical Operations (ORG_ADMIN, CLINICIAN, NURSE)
const clinicalNavigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Triage Queue', href: '/triage-queue', icon: FireIcon },
  { name: 'Tasks', href: '/tasks', icon: CheckCircleIcon },
  { name: 'Encounter Notes', href: '/encounter-notes', icon: DocumentTextIcon },
  { name: 'Billing Readiness', href: '/billing-readiness', icon: CurrencyDollarIcon },
  { name: 'Patients', href: '/patients', icon: UserGroupIcon },
  { name: 'Clinicians', href: '/clinicians', icon: UserIcon },
  { name: 'Enrollments', href: '/enrollments', icon: ClipboardDocumentListIcon },
  { name: 'Observations', href: '/observations', icon: EyeIcon },
  { name: 'Alerts', href: '/alerts', icon: BellIcon },
  { name: 'Assessment Templates', href: '/assessment-templates', icon: DocumentTextIcon },
  { name: 'Metric Definitions', href: '/metric-definitions', icon: ChartBarIcon },
  { name: 'Alert Rules', href: '/alert-rules', icon: ShieldCheckIcon },
  { name: 'Condition Presets', href: '/condition-presets', icon: ClipboardDocumentCheckIcon },
]

// ORG_ADMIN specific navigation (client admin)
const orgAdminNavigation = [
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [navigation, setNavigation] = useState([])
  const [adminNav, setAdminNav] = useState([])
  const [currentOrganization, setCurrentOrganization] = useState(null)
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = await api.getCurrentUserProfile()
        setCurrentUser(user)

        // Set current organization from user profile
        if (user.organizations && user.organizations.length > 0) {
          const currentOrg = user.organizations.find(
            org => org.organizationId === user.currentOrganization
          ) || user.organizations[0]
          setCurrentOrganization(currentOrg)
        }

        // Check if user is platform admin
        const isPlatformAdmin = user.isPlatformAdmin || false
        const isOrgAdmin = user.organizations?.some(org => org.role === 'ORG_ADMIN')

        if (isPlatformAdmin) {
          setUserRole('PLATFORM_ADMIN')
          setNavigation(platformNavigation)
          setAdminNav([])  // Platform admin has everything in main nav
        } else if (isOrgAdmin) {
          setUserRole('ORG_ADMIN')
          setNavigation(clinicalNavigation)
          setAdminNav(orgAdminNavigation)  // ORG_ADMIN gets user management
        } else {
          setUserRole('USER')
          setNavigation(clinicalNavigation)
          setAdminNav([])  // Regular users get clinical nav only
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setUserRole('USER')
        setNavigation(clinicalNavigation)
        setAdminNav([])
      }
    }
    fetchUserRole()
  }, [])

  const handleSwitchOrganization = async (organizationId) => {
    try {
      setIsSwitchingOrg(true)

      // Call API to switch organization
      const response = await api.switchOrganization(organizationId)

      // Update token in localStorage
      localStorage.setItem('authToken', response.token)

      // Reload the page to refresh all data with new organization context
      window.location.reload()
    } catch (error) {
      console.error('Error switching organization:', error)
      alert('Failed to switch organization. Please try again.')
    } finally {
      setIsSwitchingOrg(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">Pain Management</h1>
            </div>
            <nav className="mt-5 space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    location.pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                  )}
                >
                  <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}

              {/* Admin Section - Only show for ORG_ADMIN */}
              {adminNav.length > 0 && (
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </h3>
                  {adminNav.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        location.pathname === item.href
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-2 py-2 text-base font-medium rounded-md mt-1'
                      )}
                    >
                      <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* User Menu for Mobile */}
              <div className="pt-4 mt-4 border-t border-gray-200">
                <Link
                  to="/profile"
                  className="group flex items-center px-2 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                >
                  <UserIcon className="mr-4 h-6 w-6 flex-shrink-0" />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full group flex items-center px-2 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                >
                  <ArrowRightOnRectangleIcon className="mr-4 h-6 w-6 flex-shrink-0" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">ClinMetrics Pro</h1>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    location.pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}

              {/* Admin Section - Only show for ORG_ADMIN */}
              {adminNav.length > 0 && (
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </h3>
                  {adminNav.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        location.pathname === item.href
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md mt-1'
                      )}
                    >
                      <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </nav>
          </div>

          {/* Organization Switcher */}
          {currentUser?.organizations && currentUser.organizations.length > 1 && (
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <Menu as="div" className="relative w-full">
                <Menu.Button className="group w-full flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 px-2 py-2 rounded-md hover:bg-gray-50">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 mr-3" />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Organization
                    </p>
                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">
                      {currentOrganization?.name || 'Select Organization'}
                    </p>
                  </div>
                  <ArrowPathIcon className={`h-4 w-4 text-gray-400 ${isSwitchingOrg ? 'animate-spin' : ''}`} />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute bottom-full left-0 mb-2 w-full origin-bottom-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-60 overflow-auto">
                    <div className="py-1">
                      {currentUser.organizations.map((org) => (
                        <Menu.Item key={org.organizationId}>
                          {({ active }) => (
                            <button
                              onClick={() => handleSwitchOrganization(org.organizationId)}
                              disabled={isSwitchingOrg || org.organizationId === currentOrganization?.organizationId}
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                org.organizationId === currentOrganization?.organizationId ? 'bg-blue-50' : '',
                                'flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 disabled:opacity-50'
                              )}
                            >
                              <div className="flex-1 text-left">
                                <p className="font-medium">{org.name}</p>
                                <p className="text-xs text-gray-500">{org.role}</p>
                              </div>
                              {org.organizationId === currentOrganization?.organizationId && (
                                <CheckIcon className="h-5 w-5 text-blue-600" />
                              )}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          )}

          {/* User Menu */}
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <Menu as="div" className="relative w-full">
              <Menu.Button className="group w-full flex items-center text-sm font-medium text-gray-700 hover:text-gray-900">
                <UserCircleIcon className="h-8 w-8 text-gray-400 group-hover:text-gray-500" />
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {currentUser?.firstName} {currentUser?.lastName}
                  </p>
                  <p className="text-xs font-medium text-gray-500">
                    {currentUser?.email}
                  </p>
                </div>
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute bottom-full left-0 mb-2 w-full origin-bottom-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/profile"
                          className={classNames(
                            active ? 'bg-gray-100' : '',
                            'flex items-center px-4 py-2 text-sm text-gray-700'
                          )}
                        >
                          <UserIcon className="mr-3 h-5 w-5 text-gray-400" />
                          Your Profile
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={classNames(
                            active ? 'bg-gray-100' : '',
                            'flex w-full items-center px-4 py-2 text-sm text-gray-700'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 bg-white pl-1 pt-1 sm:pl-3 sm:pt-3 lg:hidden">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}