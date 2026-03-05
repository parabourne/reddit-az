"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, MessageSquare, Trash2, Edit3, 
  Sun, Moon, Award, Calendar, Loader2, X,
  Facebook, LogOut
} from "lucide-react";
import { db, auth } from "../lib/firebase"; 
import { 
  collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, orderBy 
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

export default function Profile() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const communities = ["r/baku", "r/texnologiya", "r/musiqi", "r/it_azerbaijan", "r/heyat"];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
        
        // İstifadəçinin öz postlarını çəkək
        const q = query(
          collection(db, "posts"),
          where("authorId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );

        const unsubscribePosts = onSnapshot(q, (snapshot) => {
          setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        }, (err) => {
          console.error(err);
          setLoading(false);
        });

        return () => unsubscribePosts();
      } else {
        // Giriş etməyibsə və ya anonimdirsə ana səhifəyə yönləndir
        const timer = setTimeout(() => {
            if (!auth.currentUser || auth.currentUser.isAnonymous) window.location.href = "/";
        }, 2000);
        return () => clearTimeout(timer);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const handleDelete = async (postId: string) => {
    if (confirm("Bu postu silmək istədiyinizə əminsiniz?")) {
      try {
        await deleteDoc(doc(db, "posts", postId));
        toast.success("Post silindi!");
      } catch (err) { toast.error("Xəta baş verdi!"); }
    }
  };

  const handleEdit = async (postId: string, oldTitle: string) => {
    const newTitle = prompt("Yeni başlığı daxil edin:", oldTitle);
    if (newTitle && newTitle !== oldTitle) {
      try {
        await updateDoc(doc(db, "posts", postId), { title: newTitle });
        toast.success("Başlıq yeniləndi!");
      } catch (err) { toast.error("Xəta baş verdi!"); }
    }
  };

  const totalKarma = userPosts.reduce((acc, post) => acc + (post.votes || 0), 0);

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen transition-colors duration-300`}>
      <Toaster position="bottom-right" />
      <div className="bg-[#DAE0E6] dark:bg-[#030303] min-h-screen text-zinc-900 dark:text-zinc-100 font-sans">
        
        {/* NAVBAR (Home ilə eyni) */}
        <nav className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white dark:bg-[#1A1A1B] px-4 md:px-20 border-b dark:border-zinc-800 shadow-sm">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="bg-orange-600 p-1.5 rounded-full text-white font-bold h-9 w-9 flex items-center justify-center shadow-lg">R</div>
            <h1 className="hidden md:block text-xl font-bold tracking-tight">reddit.az</h1>
          </Link>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition">
                {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
            {user && (
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-500 transition">
                <LogOut size={20} /> <span className="hidden md:block">Çıxış</span>
              </button>
            )}
          </div>
        </nav>

        <main className="mx-auto flex max-w-6xl gap-6 p-4 md:p-6">
          <div className="flex w-full flex-col gap-4 md:w-2/3">
            
            {/* GERİ QAYITMA LİNKİ */}
            <Link href="/" className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline mb-2">
              <ArrowLeft size={14} /> ANA SƏHİFƏYƏ QAYIT
            </Link>

            {/* PROFİL MƏLUMAT KARTI */}
            <div className="flex flex-col gap-4 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <img src={user?.photoURL} className="h-20 w-20 rounded-full border-4 border-orange-500" alt="avatar" />
                <div>
                  <h2 className="text-2xl font-bold leading-tight">{user?.displayName}</h2>
                  <p className="text-gray-500 text-sm italic">u/{user?.displayName?.replace(/\s+/g, '').toLowerCase()}</p>
                </div>
              </div>
              <div className="flex gap-4 border-t dark:border-zinc-800 pt-4 mt-2">
                <div className="flex flex-col">
                  <span className="text-lg font-bold flex items-center gap-1"><Award size={16} className="text-orange-500" /> {totalKarma}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Karma</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold flex items-center gap-1"><Calendar size={16} className="text-blue-500" /> {userPosts.length}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Paylaşımlar</span>
                </div>
              </div>
            </div>

            <h3 className="text-xs font-bold text-gray-500 uppercase px-1 mt-4 tracking-widest">Paylaşımlarım</h3>

            {/* POSTLAR SİYAHISI */}
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>)}
              </div>
            ) : userPosts.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-[#1A1A1B] rounded border border-dashed dark:border-zinc-800 opacity-50">
                Hələ heç bir post paylaşmamısınız.
              </div>
            ) : (
              userPosts.map((post) => (
                <div key={post.id} className="flex flex-col rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] shadow-sm overflow-hidden">
                  <div className="flex p-4">
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{post.community}</span>
                          <span>• {formatTime(post.createdAt)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(post.id, post.title)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded transition">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(post.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded transition">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h2 className="text-lg font-semibold mb-2 leading-tight">{post.title}</h2>
                      <div className="flex gap-4 text-xs font-bold text-gray-500 mt-2">
                        <span className="flex items-center gap-1"><ArrowBigUp size={16} /> {post.votes || 0} Səs</span>
                        <span className="flex items-center gap-1"><MessageSquare size={16} /> {post.comments || 0} Şərh</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ASIDE - SAĞ PANEL (Home ilə eyni) */}
          <aside className="hidden w-1/3 flex-col gap-4 md:flex">
            <div className="rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] overflow-hidden shadow-sm">
               <div className="h-10 bg-blue-600 p-2 flex items-center uppercase text-white font-bold text-[10px] px-4">Populyar İcmalar</div>
               <div className="p-2 flex flex-col gap-1">
                  {communities.map(c => (
                    <div key={c} className="flex items-center justify-between p-2 rounded cursor-default opacity-70">
                      <span className="text-sm font-semibold">{c}</span>
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-[#1A1A1B] rounded border border-gray-300 dark:border-zinc-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase mb-2 text-gray-500">Haqqımızda</h3>
              <p className="text-xs leading-relaxed opacity-70 mb-4">Reddit.az Azərbaycanın müzakirə platformasıdır. İcmalarımıza qoşulun!</p>
              <div className="space-y-3 border-t dark:border-zinc-800 pt-4">
                <a href="https://wa.me/994555556963" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-semibold hover:text-green-500 transition group">
                   <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full group-hover:bg-green-500 transition-colors">
                      <MessageSquare size={14} className="text-green-600 group-hover:text-white" />
                   </div>
                   WhatsApp: 055 555 69 63
                </a>
                <a href="https://www.facebook.com/parabournex" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-semibold hover:text-blue-500 transition group">
                   <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full group-hover:bg-blue-600 transition-colors">
                      <Facebook size={14} className="text-blue-600 group-hover:text-white" />
                   </div>
                   Facebook: parabournex
                </a>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}