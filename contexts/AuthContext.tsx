import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HiveKeychain, KeychainResponse } from '../types';

interface AuthContextType {
  user: string | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  vote: (author: string, permlink: string, weight: number) => Promise<KeychainResponse>;
  comment: (parentAuthor: string, parentPermlink: string, title: string, body: string, tags: string[], declinePayout?: boolean) => Promise<KeychainResponse>;
  customJson: (id: string, json: any, display_name: string, keyType?: 'Posting' | 'Active') => Promise<KeychainResponse>;
  isKeychainInstalled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [isKeychainInstalled, setIsKeychainInstalled] = useState(false);

  useEffect(() => {
    // Check if keychain is installed after window load
    const checkKeychain = () => {
      if (window.hive_keychain) {
        setIsKeychainInstalled(true);
      } else {
        // Fallback for slower injections
        setTimeout(() => {
          if (window.hive_keychain) setIsKeychainInstalled(true);
        }, 500);
      }
    };
    
    checkKeychain();

    // Persist login
    const savedUser = localStorage.getItem('cent_user');
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const login = async (username: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!window.hive_keychain) {
        alert("Hive Keychain não está instalado!");
        reject("Keychain missing");
        return;
      }

      const ts = Date.now();
      const message = `Login to CENT Explorer: ${ts}`;

      window.hive_keychain.requestSignBuffer(
        username,
        message,
        'Posting',
        (response: KeychainResponse) => {
          if (response.success) {
            setUser(username);
            localStorage.setItem('cent_user', username);
            resolve();
          } else {
            console.error(response);
            reject(response.msg);
          }
        }
      );
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cent_user');
  };

  const vote = async (author: string, permlink: string, weight: number): Promise<KeychainResponse> => {
    return new Promise((resolve) => {
      if (!user || !window.hive_keychain) {
        resolve({ success: false, msg: "User not logged in or Keychain missing" });
        return;
      }

      window.hive_keychain.requestVote(
        user,
        permlink,
        author,
        weight,
        (response: KeychainResponse) => {
          resolve(response);
        }
      );
    });
  };

  const comment = async (parentAuthor: string, parentPermlink: string, title: string, body: string, tags: string[], declinePayout: boolean = false): Promise<KeychainResponse> => {
    return new Promise((resolve) => {
      if (!user || !window.hive_keychain) {
        resolve({ success: false, msg: "User not logged in or Keychain missing" });
        return;
      }

      const cleanTitle = title.trim();
      const permlink = cleanTitle 
        ? cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
        : 're-' + parentPermlink + '-' + Date.now();
        
      const metadata = {
        tags: tags,
        app: 'cent-explorer/0.1'
      };

      const operations: any[] = [
        ['comment', {
          parent_author: parentAuthor,
          parent_permlink: parentPermlink,
          author: user,
          permlink: permlink,
          title: cleanTitle,
          body: body,
          json_metadata: JSON.stringify(metadata)
        }]
      ];

      if (declinePayout) {
        operations.push(['comment_options', {
          author: user,
          permlink: permlink,
          max_accepted_payout: '0.000 HBD',
          percent_hbd: 10000,
          allow_votes: true,
          allow_curation_rewards: true,
          extensions: []
        }]);
      }

      window.hive_keychain.requestBroadcast(
        user,
        operations,
        'Posting',
        (response: KeychainResponse) => {
          resolve(response);
        }
      );
    });
  };

  const customJson = async (id: string, json: any, display_name: string, keyType: 'Posting' | 'Active' = 'Posting'): Promise<KeychainResponse> => {
    return new Promise((resolve) => {
      if (!user || !window.hive_keychain) {
        resolve({ success: false, msg: "User not logged in or Keychain missing" });
        return;
      }

      window.hive_keychain.requestCustomJson(
        user,
        id,
        keyType,
        JSON.stringify(json),
        display_name,
        (response: KeychainResponse) => resolve(response)
      );
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, vote, comment, customJson, isKeychainInstalled }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};