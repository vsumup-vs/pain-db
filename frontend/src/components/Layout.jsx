import React, { useState, useEffect, Fragment } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Transition } from '@headlessui/react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import VitalEdgeLogo from './VitalEdgeLogo'
import Footer from './Footer'
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
  ArrowPathIcon,
  PresentationChartLineIcon,
  BookmarkIcon
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

// All available clinical menu items with role-based visibility
// roles: Array of user roles that should see this menu item
const allClinicalNavItems = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'BILLING_ADMIN', 'RESEARCHER'] },
  { name: 'Triage Queue', href: '/triage-queue', icon: FireIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE'] },
  { name: 'Tasks', href: '/tasks', icon: CheckCircleIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE'] },
  { name: 'Assessments', href: '/assessments', icon: ClipboardDocumentListIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'RESEARCHER'] },
  { name: 'Encounter Notes', href: '/encounter-notes', icon: DocumentTextIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'BILLING_ADMIN'] },
  { name: 'Billing Readiness', href: '/billing-readiness', icon: CurrencyDollarIcon, roles: ['ORG_ADMIN', 'BILLING_ADMIN'] },
  { name: 'Clinician Analytics', href: '/analytics/clinician-workflow', icon: PresentationChartLineIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'BILLING_ADMIN'] },
  { name: 'Patient Engagement', href: '/analytics/patient-engagement', icon: PresentationChartLineIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'RESEARCHER'] },
  { name: 'Patients', href: '/patients', icon: UserGroupIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'BILLING_ADMIN', 'RESEARCHER'] },
  { name: 'Clinicians', href: '/clinicians', icon: UserIcon, roles: ['ORG_ADMIN'] },
  { name: 'Enrollments', href: '/enrollments', icon: ClipboardDocumentListIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'BILLING_ADMIN', 'RESEARCHER'] },
  { name: 'Care Programs', href: '/care-programs', icon: ChartBarIcon, roles: ['ORG_ADMIN'] },
  { name: 'Observations', href: '/observations', icon: EyeIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'RESEARCHER'] },
  { name: 'Observation Review', href: '/observation-review', icon: ClipboardDocumentCheckIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'RESEARCHER'] },
  { name: 'Alerts', href: '/alerts', icon: BellIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE'] },
  { name: 'Assessment Templates', href: '/assessment-templates', icon: DocumentTextIcon, roles: ['ORG_ADMIN', 'RESEARCHER'] },
  { name: 'Metric Definitions', href: '/metric-definitions', icon: ChartBarIcon, roles: ['ORG_ADMIN', 'RESEARCHER'] },
  { name: 'Alert Rules', href: '/alert-rules', icon: ShieldCheckIcon, roles: ['ORG_ADMIN'] },
  { name: 'Condition Presets', href: '/condition-presets', icon: ClipboardDocumentCheckIcon, roles: ['ORG_ADMIN'] },
  { name: 'Saved Views', href: '/saved-views', icon: BookmarkIcon, roles: ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'RESEARCHER'] },
]

// ORG_ADMIN specific navigation (client admin)
const orgAdminNavigation = [
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Organization Settings', href: '/settings/organization', icon: Cog6ToothIcon },
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

  // Fetch unclaimed alerts count for badge
  const { data: unclaimedData } = useQuery({
    queryKey: ['unclaimedAlertsCount'],
    queryFn: () => api.getTriageQueue({
      status: 'PENDING',
      claimedBy: 'unclaimed',
      limit: 1
    }),
    refetchInterval: 60000, // Refresh every 60 seconds
    enabled: !!currentUser // Only fetch when user is authenticated
  })

  const unclaimedCount = unclaimedData?.data?.pagination?.total || 0

  // Fetch organization branding (logo and config)
  const { data: brandingData } = useQuery({
    queryKey: ['organizationBranding', currentUser?.currentOrganization],
    queryFn: () => api.getBranding(currentUser.currentOrganization),
    enabled: !!currentUser?.currentOrganization, // Only fetch when we have current organization
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const organizationLogo = brandingData?.data?.logoUrl
  const brandingConfig = brandingData?.data?.brandingConfig

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

          // Get user's actual role from UserOrganization
          const userRole = currentOrg?.role // CLINICIAN, NURSE, ORG_ADMIN, BILLING_ADMIN, RESEARCHER, etc.
          const isPlatformOrg = currentOrg?.type === 'PLATFORM'

          console.log('[Layout] User role detected:', userRole, 'Organization type:', currentOrg?.type)

          if (isPlatformOrg) {
            // PLATFORM organization - show platform management navigation
            setUserRole('PLATFORM_ADMIN')
            setNavigation(platformNavigation)
            setAdminNav([])  // Platform admin has everything in main nav
            console.log('[Layout] Platform admin - showing', platformNavigation.length, 'items')
          } else {
            // Client organization - filter navigation based on specific role
            setUserRole(userRole)

            // Filter clinical navigation items based on user's role
            const filteredNav = allClinicalNavItems.filter(item =>
              item.roles.includes(userRole)
            )
            setNavigation(filteredNav)
            console.log('[Layout] Role:', userRole, '- showing', filteredNav.length, 'menu items (filtered from', allClinicalNavItems.length, 'total)')

            // ORG_ADMIN gets additional user management section
            if (userRole === 'ORG_ADMIN') {
              setAdminNav(orgAdminNavigation)
            } else {
              setAdminNav([])
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        // Fallback to basic user role with minimal navigation
        setUserRole('USER')
        const fallbackNav = allClinicalNavItems.filter(item =>
          item.roles.includes('CLINICIAN') // Use CLINICIAN as fallback
        )
        setNavigation(fallbackNav)
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
            <div className="flex flex-shrink-0 items-center px-4 space-x-2">
              {organizationLogo ? (
                <img
                  src={organizationLogo}
                  alt="Organization Logo"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <VitalEdgeLogo className="w-8 h-8" animated={false} />
              )}
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {brandingData?.data?.organizationName || 'VitalEdge'}
              </h1>
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
                    'group flex items-center justify-between px-2 py-2 text-base font-medium rounded-md'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                    {item.name}
                  </div>
                  {item.name === 'Triage Queue' && unclaimedCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                      {unclaimedCount}
                    </span>
                  )}
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
            <div className="flex flex-shrink-0 items-center px-4 space-x-2">
              {organizationLogo ? (
                <img
                  src={organizationLogo}
                  alt="Organization Logo"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <VitalEdgeLogo className="w-8 h-8" animated={false} />
              )}
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {brandingData?.data?.organizationName || 'VitalEdge'}
              </h1>
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
                    'group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
                    {item.name}
                  </div>
                  {item.name === 'Triage Queue' && unclaimedCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                      {unclaimedCount}
                    </span>
                  )}
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
      <div className="lg:pl-64 flex flex-col min-h-screen">
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
        <Footer />
      </div>
    </div>
  )
}