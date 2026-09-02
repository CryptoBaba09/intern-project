import "./globals.css";
export const metadata = { title: "$INTERN", description: "test" };
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0B0C0B] text-[#EDEEF0]" style={{fontFamily: "'Space Grotesk', 'Arial', sans-serif"}}>
        {children}
      </body>
    </html>
  );
}
