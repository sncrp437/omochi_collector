interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  return <>{children}</>;
};

export default PublicRoute;
