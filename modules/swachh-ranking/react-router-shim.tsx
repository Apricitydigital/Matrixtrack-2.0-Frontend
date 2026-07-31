'use client';
import React from 'react';
import NextLink from 'next/link';
import { useRouter, usePathname, useParams as useNextParams, useSearchParams as useNextSearchParams } from 'next/navigation';

function normalizeSwachhRoute(target: string): string {
  if (typeof target === 'string' && target.startsWith('/admin/')) {
    const clean = target.replace('/admin/', '');
    const [pathPart, queryPart] = clean.split('?');
    const viewMap: Record<string, string> = {
      'reports': 'reports',
      'participants': 'participants',
      'users': 'users',
      'approvals': 'approvals',
      'questionnaire': 'questionnaire',
      'sa-review': 'sa-review',
      'results': 'results',
      'profile': 'profile',
      'access-control': 'access-control',
      'areas': 'participants'
    };
    const mappedView = viewMap[pathPart] || pathPart || 'dashboard';
    const query = queryPart ? `&${queryPart}` : '';
    return `/ward-ranking?view=${mappedView}${query}`;
  }
  return target;
}

export const useNavigate = () => {
  const router = useRouter();
  return (to: string | number) => {
    if (typeof to === 'string') {
      router.push(normalizeSwachhRoute(to));
    } else if (to === -1) {
      router.back();
    }
  };
};

export const useLocation = () => {
  const pathname = usePathname();
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const fullPath = search ? `${pathname}${search}` : pathname;
  return { pathname: fullPath, search, hash: '', state: null, key: 'default' };
};

export const useParams = () => {
  const params = useNextParams();
  return params || {};
};

export const useSearchParams = () => {
  const params = useNextSearchParams();
  return [params, () => {}] as const;
};

export const Link: React.FC<any> = ({ to, href, children, ...props }) => {
  const rawTarget = to || href || '#';
  const target = normalizeSwachhRoute(rawTarget);
  return (
    <NextLink href={target} {...props}>
      {children}
    </NextLink>
  );
};
