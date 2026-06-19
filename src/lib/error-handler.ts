import { auth } from '../firebase';
import { toast } from 'sonner';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  GEMINI = 'gemini',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, silent: boolean = false) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  
  if (!silent) {
    let userMessage = 'An unexpected error occurred. Please try again.';
    if (errInfo.error.includes('permission-denied') || errInfo.error.includes('Missing or insufficient permissions')) {
      userMessage = 'You do not have permission to perform this action.';
    } else if (errInfo.error.includes('unavailable')) {
      userMessage = 'The service is currently unavailable. Please check your connection.';
    } else if (errInfo.error.includes('not-found')) {
      userMessage = 'The requested resource was not found.';
    }

    toast.error(userMessage);
  }
  throw new Error(JSON.stringify(errInfo));
}

export function handleGeminiError(error: unknown, task: string) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Gemini API Error during ${task}: `, errorMessage);
  
  let userMessage = `Failed to ${task}. Please try again later.`;
  if (errorMessage.includes('API_KEY_INVALID')) {
    userMessage = 'Invalid API configuration. Please contact support.';
  } else if (errorMessage.includes('quota')) {
    userMessage = 'Service limit reached. Please try again in a few minutes.';
  } else if (errorMessage.includes('safety')) {
    userMessage = 'The content was flagged by safety filters. Please try a different query.';
  }

  toast.error(userMessage);
  throw error;
}
