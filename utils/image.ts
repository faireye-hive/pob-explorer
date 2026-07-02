import { HivePost } from '../types';
import { sanitizeUrl } from './security';

export const extractImage = (post: HivePost): string | null => {
  try {
    let json;
    if (typeof post.json_metadata === 'string') {
      json = JSON.parse(post.json_metadata);
    } else {
      json = post.json_metadata;
    }

    let imgUrl = null;

    if (json && json.image && Array.isArray(json.image) && json.image.length > 0) {
      imgUrl = json.image[0];
    } else if (json && json.thumbnail) {
      imgUrl = json.thumbnail;
    } else if (json && typeof json.images === 'object') {
       // Support for object containing images
       const keys = Object.keys(json.images);
       if (keys.length > 0) {
           imgUrl = json.images[keys[0]];
       }
    } else if (json && json.images && Array.isArray(json.images) && json.images.length > 0) {
       imgUrl = json.images[0];
    }

    if (!imgUrl && post.body) {
      const imgMatch = post.body.match(/!\[.*?\]\((.*?)\)/);
      if (imgMatch && imgMatch[1]) {
          imgUrl = imgMatch[1];
      }
    }

    if (!imgUrl && json) {
        // Try raw regex on json string if everything else fails
        const jsonStr = JSON.stringify(json);
        const imgMatch = jsonStr.match(/(https?:\/\/[^\s<"']+\.(?:png|jpe?g|gif|webp))/i);
        if (imgMatch && imgMatch[1]) {
            imgUrl = imgMatch[1];
        }
    }
    
    if (imgUrl) {
       const sanitized = sanitizeUrl(imgUrl);
       if (sanitized) {
           const isHiveImageHost = sanitized.includes('images.hive.blog') || 
                                   sanitized.includes('images.ecency.com') ||
                                   sanitized.includes('files.peakd.com') ||
                                   sanitized.includes('hive.blog') ||
                                   sanitized.includes('peakd.com') ||
                                   sanitized.includes('ecency.com');
           
           if (!isHiveImageHost) {
               return `https://images.hive.blog/0x0/${sanitized}`;
           }
           return sanitized;
       }
    }

    return null;
  } catch (e) {
    return null;
  }
};
