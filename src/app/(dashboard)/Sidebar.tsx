'use client';
import { 
  Search, 
  CalendarDays, 
  Activity, 
  BarChart3, 
  Send, 
  Users, 
  Briefcase, 
  Plane, 
  Settings,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const menuItems = [
  { name: 'मतदाता खोज व पर्ची', description: 'पर्ची वितरण व त्वरित खोज', icon: Search, href: '/' },
  { name: 'मतदान दिवस डेस्क', description: 'बूथ-वार लाइव मार्किंग', icon: CalendarDays, href: '/poll-desk' },
  { name: 'लाइव मतदान दर', description: 'रियल-टाइम पोलिंग रेट', icon: Activity, href: '/turnout' },
  { name: 'पॉलिटिकल वॉर-रूम', description: 'रणनीतिक विश्लेषण व आंकड़े', icon: BarChart3, href: '/warroom' },
  { name: 'भेजी गई पर्चियाँ', description: 'WhatsApp वितरण ऑडिट', icon: Send, href: '/history' },
  { name: 'जातीय समीकरण', description: 'सामाजिक व वर्ग आंकड़े', icon: Users, href: '/community' },
  { name: 'कार्यकर्ता प्रबंधन', description: 'ड्यूटी ट्रैकिंग व प्रबंधन', icon: Briefcase, href: '/workers' },
  { name: 'प्रवासी मतदाता', description: 'कॉलिंग व यात्रा समन्वय', icon: Plane, href: '/migrants' },
  { name: 'सेटिंग्स व पासवर्ड', description: 'खाता सेटिंग्स और पासवर्ड', icon: Settings, href: '/settings' },
  { name: 'अकाउंट्स व परमिशन्स', description: 'सब-अकाउंट्स व टीम', icon: Settings, href: '/accounts' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('selectedClientOrgId');
    router.push('/login');
  };

  return (
    <aside className="w-80 bg-[#111827] border-r border-slate-800 flex flex-col h-full shadow-sm text-slate-100">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 overflow-hidden">
          <img src="/logo.webp" alt="Logo" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }} />
        </div>
        <div>
          <h1 className="font-bold text-xl text-white tracking-tight">VijaySetu</h1>
          <p className="text-xs text-indigo-300 font-medium uppercase tracking-wider">Voter Management</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link href={item.href} key={item.name}>
              <div className={`flex items-start space-x-4 p-3 rounded-xl transition-all duration-200 group \${isActive ? 'bg-indigo-600/20 border border-indigo-500/30 shadow-sm' : 'hover:bg-slate-800/50 border border-transparent'}`}>
                <div className={`mt-0.5 p-2 rounded-lg \${isActive ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-indigo-400 group-hover:shadow-sm'}`}>
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <div>
                  <h3 className={`font-semibold text-[15px] \${isActive ? 'text-indigo-200' : 'text-slate-300 group-hover:text-white'}`}>{item.name}</h3>
                  <p className={`text-xs mt-0.5 \${isActive ? 'text-indigo-300/80' : 'text-slate-500'}`}>{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          type="button"
          className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors group cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-red-500/20 group-hover:shadow-sm">
             <LogOut size={18} />
          </div>
          <span className="font-medium text-sm">लॉगआउट (Logout)</span>
        </button>
      </div>
    </aside>
  );
}
