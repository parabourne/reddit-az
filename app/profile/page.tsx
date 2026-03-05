"use client";

import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { 
  collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, orderBy 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Trash2, Edit3, ArrowLeft, Award, Calendar } from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
        // İstifadəçinin postlarını gətir
        const q = query(
          collection(db, "posts"),
          where("authorId", "==", currentUser.uid), // Postu yaradarkən authorId saxlamalıyıq
          orderBy("createdAt", "desc")
        );

        const unsubscribePosts = onSnapshot(q, (snapshot) => {
          setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });

        return () => unsubscribePosts();
      } else {
        window.location.href = "/"; // Giriş etməyibsə ana səhifəyə at
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleDelete = async (postId: string) => {
    if (confirm("Bu postu silmək istədiyinizə əminsiniz?")) {
      try {
        await deleteDoc(doc(db, "posts", postId));
        toast.success("Post silindi");
      } catch (err) {
        toast.error("Xəta baş verdi");
      }
    }
  };

  const handleEdit = async (postId: string, oldTitle: string) => {
    const newTitle = prompt("Yeni başlığı yazın:", oldTitle);
    if (newTitle && newTitle !== oldTitle) {
      try {
        await updateDoc(doc(db, "posts", postId), { title: newTitle });
        toast.success("Yeniləndi");
      } catch (err) {
        toast.error("Xəta baş verdi");
      }
    }
  };

  if (loading) return <div className="p-10 text-center">Yüklənir...</div>;

  return (
    <div className="min-h-screen bg-[#DAE0E6] dark:bg-[#030303] p-4 md:p-10">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold mb-6 hover:text-orange-600 transition">
          <ArrowLeft size={18} /> Ana Səhifəyə Qayıt
        </Link>

        {/* PROFİL KARTI */}
        <div className="bg-white dark:bg-[#1A1A1B] rounded-lg border border-gray-300 dark:border-zinc-800 p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-6">
            <img src={user?.photoURL} className="h-20 w-20 rounded-full border-4 border-orange-500 shadow-md" alt="avatar" />
            <div>
              <h1 className="text-2xl font-bold">{user?.displayName}</h1>
              <p className="text-gray-500 text-sm">u/{user?.displayName?.replace(/\s+/g, '').toLowerCase()}</p>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1 text-xs font-bold bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                  <Award size={14} className="text-orange-500" /> {userPosts.reduce((acc, post) => acc + (post.votes || 0), 0)} Karma
                </div>
                <div className="flex items-center gap-1 text-xs font-bold bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                  <Calendar size={14} /> Qoşulub: {new Date(user?.metadata.creationTime).toLocaleDateString('az-AZ')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4 border-b dark:border-zinc-800 pb-2">Paylaşımlarım ({userPosts.length})</h2>

        {/* İSTİFADƏÇİNİN POSTLARI */}
        <div className="space-y-4">
          {userPosts.length === 0 ? (
            <p className="text-center py-10 opacity-50">Hələ heç bir post paylaşmamısınız.</p>
          ) : (
            userPosts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-[#1A1A1B] border border-gray-300 dark:border-zinc-800 rounded p-4 flex justify-between items-center shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-orange-600 uppercase">{post.community}</span>
                  <h3 className="font-semibold text-md leading-tight mt-1">{post.title}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(post.id, post.title)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded-full transition">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(post.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-full transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}