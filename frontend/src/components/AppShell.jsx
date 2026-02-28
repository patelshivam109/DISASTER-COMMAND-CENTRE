import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  return (
    /* Change 1: Use 'flex' and 'h-screen' to create a side-by-side layout 
       that fills the viewport without scrolling the whole page.
    */
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      
      {/* Sidebar layout */}
      <Sidebar />

      {/* Change 3: Main content is now 'flex-1' (fills remaining space) 
         and has its own scrollbar ('overflow-y-auto').
      */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}