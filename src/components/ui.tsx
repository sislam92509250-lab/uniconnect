import Link from 'next/link';
import { BadgeCheck, CircleUserRound, ArrowUpRight } from 'lucide-react';
export function Avatar({name,large=false,small=false}:{name:string;large?:boolean;small?:boolean}) {
  return <span aria-label={`${name} avatar`} className={`avatar ${large?'avatar-lg':small?'avatar-sm':''}`}>{name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase() || '?'}</span>;
}
export function Verified({verified}:{verified:boolean}) {
  return verified ? <span title="Affiliation verified by university admin" className="inline-flex items-center gap-1 text-blue-600 text-xs font-semibold"><BadgeCheck size={15}/> Verified</span>
   : <span className="pill">Unverified</span>;
}
export function Empty({title,subtitle}:{title:string;subtitle?:string}) {
  return <div className="empty"><CircleUserRound size={28} className="mx-auto mb-3 text-slate-400"/><div className="font-bold text-slate-600">{title}</div>{subtitle&&<p className="mt-2 text-xs">{subtitle}</p>}</div>;
}
export function Heading({title,subtitle,action,href}:{title:string;subtitle?:string;action?:string;href?:string}) {
  return <div className="flex flex-wrap items-start justify-between gap-3 mb-6"><div><h1 className="h1">{title}</h1>{subtitle&&<p className="muted text-sm mt-2">{subtitle}</p>}</div>{action&&href&&<Link href={href} className="btn btn-primary">{action}<ArrowUpRight size={14}/></Link>}</div>;
}
