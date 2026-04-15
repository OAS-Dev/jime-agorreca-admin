import { Sidebar } from '@/components/admin/Sidebar';

const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className='flex min-h-screen bg-surface-bright'>
      <Sidebar />
      <div className='flex-1 ml-64 min-h-screen'>
        {children}
      </div>
    </div>
  );
}

export default DashboardLayout;
