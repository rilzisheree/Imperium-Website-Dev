import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetStaffMe } from "@workspace/api-client-react";

export function StaffGuard({ children }: { children: ReactNode }) {
  const [_, setLocation] = useLocation();
  const { data: staff, isLoading, error } = useGetStaffMe({
    query: {
      retry: false
    }
  });

  useEffect(() => {
    if (!isLoading && (error || !staff)) {
      setLocation("/staff");
    }
  }, [isLoading, error, staff, setLocation]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Verifying credentials...</div>;
  }

  if (!staff) {
    return null; // Will redirect
  }

  return <>{children}</>;
}