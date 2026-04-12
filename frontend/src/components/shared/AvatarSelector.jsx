import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

// 20 avatar options using DiceBear API with different styles
const AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Max',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot5',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Wink',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Heart'
];

export { AVATARS };

export default function AvatarSelector({ selectedAvatar, onSelect, onClose }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black mb-4 text-center">Choose Your Avatar</h2>
        
        <div className="grid grid-cols-4 gap-3">
          {AVATARS.map((avatar, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(avatar)}
              className={`relative w-full aspect-square rounded-2xl overflow-hidden border-4 transition-all ${
                selectedAvatar === avatar 
                  ? 'border-purple-500 shadow-lg' 
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <img 
                src={avatar} 
                alt={`Avatar ${index + 1}`}
                className="w-full h-full object-cover bg-gray-100"
              />
              {selectedAvatar === avatar && (
                <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </motion.button>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}