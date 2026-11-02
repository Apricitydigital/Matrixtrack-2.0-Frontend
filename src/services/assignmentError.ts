import {ApiError} from './api';

export function assignmentError(error:unknown):string {
  // A missing route is distinct from the API's explicit location-not-found reply.
  if(error instanceof ApiError && error.status===404 && /^Request failed \(404\)$/.test(error.message))
    return 'Daroga assignments are unavailable. Please ask your administrator to update the service, then retry.';
  return error instanceof Error?error.message:'Unable to load or save the Daroga assignment.';
}
