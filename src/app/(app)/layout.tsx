import { SidebarProvider } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/layout/AppSidebar";
import { AppHeader } from "@/shared/components/layout/AppHeader";
import { TooltipProvider } from "@/shared/components/ui/tooltip";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-col flex-1 min-h-screen w-full">
          <AppHeader />
          <main className="flex-1 p-6 lg:p-8">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
