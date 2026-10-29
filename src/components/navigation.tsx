'use client';
import Link from 'next/link';import {usePathname} from 'next/navigation';
import {House,Users,Search,MessagesSquare,UsersRound,GraduationCap,BriefcaseBusiness,CalendarDays,Bell,UserRound,Settings,ShieldCheck} from 'lucide-react';
export const links=[
 {href:'/feed',label:'Home feed',icon:House},{href:'/network',label:'My network',icon:Users},
 {href:'/discover',label:'Discover people',icon:Search},{href:'/messages',label:'Messages',icon:MessagesSquare},
 {href:'/communities',label:'Communities',icon:UsersRound},{href:'/mentorship',label:'Mentorship',icon:GraduationCap},
 {href:'/jobs',label:'Jobs & internships',icon:BriefcaseBusiness},{href:'/events',label:'Events',icon:CalendarDays},
 {href:'/notifications',label:'Notifications',icon:Bell},{href:'/profile/edit',label:'My profile',icon:UserRound},
 {href:'/settings',label:'Settings',icon:Settings},
];
export function Navigation({admin}:{admin:boolean}){const path=usePathname();return <nav className="sidebar-nav">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={`nav-link ${path===href||path.startsWith(href+'/')?'active':''}`}><Icon size={18} strokeWidth={1.8}/>{label}</Link>)}{admin&&<Link className={`nav-link ${path.startsWith('/admin')?'active':''}`} href="/admin"><ShieldCheck size={18}/>Admin dashboard</Link>}</nav>}
export function MobileNav(){const path=usePathname(); const selected=[links[0],links[2],links[3],links[8],links[9]];return <nav className="mobile-nav">{selected.map(({href,label,icon:Icon})=><Link key={href} href={href} style={{color:path.startsWith(href)?'#3759eb':undefined}}><Icon size={20}/>{label==='Home feed'?'Feed':label==='Discover people'?'People':label==='My profile'?'Profile':label}</Link>)}</nav>}
