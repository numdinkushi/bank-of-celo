import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { mnemonicToAccount } from 'viem/accounts';
import { APP_BUTTON_TEXT, APP_ICON_URL, APP_NAME, APP_OG_IMAGE_URL, APP_SPLASH_BACKGROUND_COLOR, APP_URL } from './constants';
import { APP_SPLASH_URL } from './constants';

interface FrameMetadata {
  accountAssociation?: {
    header: string;
    payload: string;
    signature: string;
  };
  frame: {
    version: string;
    name: string;
    iconUrl: string;
    homeUrl: string;
    imageUrl: string;
    buttonTitle: string;
    splashImageUrl: string;
    splashBackgroundColor: string;
    webhookUrl: string;
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSecretEnvVars() {
  const seedPhrase = process.env.SEED_PHRASE;
  const fid = process.env.FID;
  
  if (!seedPhrase || !fid) {
    return null;
  }

  return { seedPhrase, fid };
}

export async function getFarcasterMetadata(): Promise<FrameMetadata> {
  // 1) Pre-signed FRAME_METADATA?
  if (process.env.FRAME_METADATA) {
    try {
      const metadata = JSON.parse(process.env.FRAME_METADATA);
      console.log('Using pre-signed frame metadata from environment');
      return metadata;
    } catch (error) {
      console.warn('Failed to parse FRAME_METADATA from environment:', error);
    }
  }

  // 2) APP_URL must be set
  if (!APP_URL) {
    throw new Error('NEXT_PUBLIC_URL (APP_URL) not configured');
  }
  const domain = new URL(APP_URL).hostname;
  console.log('Using domain for manifest:', domain);

  // 3) STATIC_ACCOUNT_ASSOCIATION override?
  let accountAssociation: FrameMetadata['accountAssociation'] | undefined;
  if (process.env.STATIC_ACCOUNT_ASSOCIATION) {
    try {
      accountAssociation = JSON.parse(process.env.STATIC_ACCOUNT_ASSOCIATION);
      console.log('Using STATIC_ACCOUNT_ASSOCIATION from env');
    } catch (err) {
      console.warn('Bad STATIC_ACCOUNT_ASSOCIATION JSON:', err);
    }
  }

  // 4) Fallback to seed-phrase if no static override
  const secretEnvVars = getSecretEnvVars();
  if (!accountAssociation && secretEnvVars) {
    const account = mnemonicToAccount(secretEnvVars.seedPhrase);
    const header = {
      fid: parseInt(secretEnvVars.fid, 10),
      type: 'custody',
      key: account.address,
    };
    const encodedHeader = Buffer.from(JSON.stringify(header), 'utf-8').toString('base64');

    const payload = { domain };
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');

    const signature = await account.signMessage({
      message: `${encodedHeader}.${encodedPayload}`,
    });
    const encodedSignature = Buffer.from(signature, 'utf-8').toString('base64url');

    accountAssociation = {
      header: encodedHeader,
      payload: encodedPayload,
      signature: encodedSignature,
    };
    console.log('Generated accountAssociation from seed phrase');
  } else if (!accountAssociation) {
    console.warn('No STATIC_ACCOUNT_ASSOCIATION or seedPhrase/FID—metadata will be unsigned');
  }

  // 5) Determine webhook URL
  const webhookUrl =
    process.env.NEYNAR_API_KEY && process.env.NEYNAR_CLIENT_ID
      ? `https://api.neynar.com/f/app/${process.env.NEYNAR_CLIENT_ID}/event`
      : `${APP_URL}/api/webhook`;

  // 6) Build and return FrameMetadata
  return {
    accountAssociation,
    frame: {
      version: '1',
      name: APP_NAME ?? 'Frames v2 Demo',
      iconUrl: APP_ICON_URL,
      homeUrl: APP_URL,
      imageUrl: APP_OG_IMAGE_URL,
      buttonTitle: APP_BUTTON_TEXT ?? 'Launch Frame',
      splashImageUrl: APP_SPLASH_URL,
      splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      webhookUrl,
    },
  };
}
