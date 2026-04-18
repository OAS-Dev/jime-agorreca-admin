import { Sidebar } from '@/components/admin/Sidebar'

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-surface-bright">
      <Sidebar />
      <div className="md:ml-64 min-h-screen flex-1">{children}</div>
    </div>
  )
}

export default DashboardLayout
