import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import '@/app/globals.css';
export const metadata: Metadata = {title:'UniConnect — Where campus meets career',description:'Connect with university students, alumni and faculty.'};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><header className="site-header"><div className="shell h-18 flex items-center justify-between">
    <Link className="brand" href="/"><span className="brand-symbol"><GraduationCap size={21}/></span>UniConnect<span style={{color:'#4161e6'}}>.</span></Link>
    <div className="header-extra text-xs text-slate-500 font-medium">Build connections that last beyond graduation</div>
  </div></header>{children}</body></html>;
}
