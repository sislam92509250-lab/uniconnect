'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
function NoticeInner() {
  const params=useSearchParams(),error=params.get('error'),notice=params.get('notice');
  if(!error&&!notice) return null;
  return <div role="status" className={`notice ${error?'notice-error':''}`}>{error||notice}</div>;
}
export function Feedback() { return <Suspense fallback={null}><NoticeInner/></Suspense>; }
