"use client";

import { useState, useEffect } from "react";
import { 
  ArrowBigUp, ArrowBigDown, MessageSquare, Share2, 
  Plus, Search, Flame, Sun, Moon, ShieldAlert 
} from "lucide-react";
// Import your firebase config
import { db, auth } from "./lib/firebase"; 
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [postInput, setPostInput] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 1. Anonim Giriş və İstifadəçi İzləmə
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonim giriş xətası:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Posts (Real-time update ilə əvəz olundu ki, səhifə yenilənmədən postlar gəlsin)
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Add Post to Firebase
  const handleAddPost = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && postInput.trim() !== "") {
      try {
        await addDoc(collection(db, "posts"), {
          title: postInput,
          community: "r/baku",
          author: user?.displayName || "Anonim Sərnişin",
          authorImg: user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
          votes: 1,
          comments: 0,
          createdAt: serverTimestamp()
        });
        setPostInput("");
      } catch (err) {
        alert("Xəta baş verdi, bazaya qoşula bilmədik.");
      }
    }
  };

  // 4. Update Votes in Firebase
  const handleVote = async (postId: string, currentVotes: number, delta: number) => {
    const postRef = doc(db, "posts", postId);
    try {
      await updateDoc(postRef, {
        votes: currentVotes + delta
      });
    } catch (err) {
      console.error("Vote error:", err);
    }
  };

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen transition-colors duration-300`}>
      <div className="bg-[#DAE0E6] dark:bg-[#030303] min-h-screen font-sans text-zinc-900 dark:text-zinc-100">
        
        {/* Modern Navbar */}
        <nav className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white dark:bg-[#1A1A1B] px-4 md:px-20 border-b border-gray-300 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-orange-600 p-1.5 rounded-full text-white font-bold text-xl h-9 w-9 flex items-center justify-center">R</div>
            <h1 className="hidden md:block text-xl font-bold tracking-tighter">reddit.az</h1>
          </div>

          <div className="flex-1 max-w-lg mx-4 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Reddit-də axtar" 
              className="w-full bg-gray-100 dark:bg-[#272729] border border-transparent focus:border-blue-500 rounded-full pl-10 pr-4 py-2 text-sm outline-none transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition"
            >
              {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
            <div className="text-xs font-bold text-orange-500 hidden sm:block">
              {user?.isAnonymous ? "Anonim Rejim" : user?.displayName}
            </div>
          </div>
        </nav>

        <main className="mx-auto flex max-w-6xl gap-6 p-4 md:p-6">
          <div className="flex w-full flex-col gap-4 md:w-2/3">
            
            {/* Post Input Field */}
            <div className="flex items-center gap-3 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-3 shadow-sm">
              <img 
                src={user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png"} 
                className="h-9 w-9 rounded-full bg-gray-200" 
              />
              <input 
                value={postInput}
                onChange={(e) => setPostInput(e.target.value)}
                onKeyDown={handleAddPost}
                type="text" 
                placeholder="Fikrinizi anonim paylaşın..." 
                className="flex-1 rounded-md bg-gray-100 dark:bg-[#272729] border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-2 shadow-sm">
              <button className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 px-4 py-1.5 rounded-full text-sm font-bold text-blue-500">
                <Flame size={18} /> Trend
              </button>
              <button className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-800 px-4 py-1.5 rounded-full text-sm font-medium text-gray-500 transition">Yeni</button>
              <button className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-800 px-4 py-1.5 rounded-full text-sm font-medium text-gray-500 transition">Top</button>
            </div>

            {/* Post Feed */}
            {loading ? (
              <div className="text-center py-10 text-gray-500 animate-pulse">Postlar yüklənir...</div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="group flex rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] hover:border-gray-400 transition cursor-pointer shadow-sm overflow-hidden">
                  {/* Vote Sidebar */}
                  <div className="flex w-10 flex-col items-center bg-gray-50 dark:bg-[#151516] p-2 border-r border-gray-100 dark:border-zinc-800">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleVote(post.id, post.votes, 1); }} 
                      className="text-gray-400 hover:text-orange-600 transition"
                    >
                      <ArrowBigUp size={28} />
                    </button>
                    <span className="text-xs font-bold py-1">{post.votes}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleVote(post.id, post.votes, -1); }} 
                      className="text-gray-400 hover:text-blue-600 transition"
                    >
                      <ArrowBigDown size={28} />
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="flex flex-col p-3 w-full">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <img src={post.authorImg} className="w-5 h-5 rounded-full" />
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline">{post.community}</span>
                      <span>• Paylaşdı u/{post.author}</span>
                    </div>
                    <h2 className="text-lg font-semibold mb-2 leading-tight">{post.title}</h2>
                    <div className="flex gap-4 text-sm font-bold text-gray-500 mt-auto pt-2">
                      <div className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-2 py-1.5 rounded transition">
                        <MessageSquare size={18} /> {post.comments} Şərh
                      </div>
                      <div className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-2 py-1.5 rounded transition">
                        <Share2 size={18} /> Paylaş
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden w-1/3 flex-col gap-4 md:flex">
            <div className="rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] overflow-hidden shadow-sm">
              <div className="h-10 bg-orange-500 p-2 flex items-center">
                <p className="text-white font-bold text-sm uppercase tracking-wider px-2">İcma Haqqında</p>
              </div>
              <div className="p-4">
                <p className="text-sm mb-4 italic text-gray-600 dark:text-gray-400 leading-relaxed">
                  Azərbaycanın ən böyük rəqəmsal icmasına xoş gəlmisiniz!
                </p>
                <div className="flex justify-between border-t border-gray-100 dark:border-zinc-800 pt-4">
                  <div className="text-center">
                    <p className="font-bold">25.3k</p>
                    <p className="text-[10px] text-gray-500 uppercase">Üzvlər</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">142</p>
                    <p className="text-[10px] text-gray-500 uppercase">Onlayn</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-4 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold mb-3 text-sm">
                <ShieldAlert size={18} className="text-blue-500" /> Qaydalar
              </h3>
              <ol className="text-xs space-y-2 list-decimal list-inside text-gray-600 dark:text-gray-400 leading-relaxed">
                <li>Hörmətli olun.</li>
                <li>Spam qadağandır.</li>
                <li>Mövzuya uyğun paylaşımlar edin.</li>
              </ol>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}