import { Outlet } from "react-router-dom";
import { Layout } from "antd";

const AdminLayout = () => {
  return (
    <Layout
      className="!min-h-[100dvh] mx-auto"
      style={{ maxWidth: 500, background: "var(--background-color)" }}
    >
      <div className="h-full">
        <Outlet />
      </div>
    </Layout>
  );
};

export default AdminLayout;
