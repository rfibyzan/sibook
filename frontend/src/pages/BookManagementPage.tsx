import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import type { Book, Category, Location } from '../lib/types';

const BookManagementPage: React.FC = () => {
  const { showAlert, showConfirm } = useNotification();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({
    isbn: '',
    title: '',
    author: '',
    category_id: '',
    location_id: '',
    stock: 0,
    price: 0,
  });
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch Books
    const { data: booksData } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Fetch Categories for dropdown
    const { data: catData } = await supabase.from('categories').select('*');
    
    // Fetch Locations for dropdown
    const { data: locData } = await supabase.from('locations').select('*');

    if (booksData) setBooks(booksData);
    if (catData) setCategories(catData);
    if (locData) setLocations(locData);
    
    setIsLoading(false);
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const bookData: any = {
      isbn: newBook.isbn,
      title: newBook.title,
      author: newBook.author,
      category_id: newBook.category_id || null,
      location_id: newBook.location_id || null,
      stock: newBook.stock,
      price: newBook.price,
    };

    const { error } = editingBookId 
      ? await (supabase.from('books') as any).update(bookData).eq('id', editingBookId)
      : await (supabase.from('books') as any).insert([bookData]);

    if (!error) {
      setIsModalOpen(false);
      setEditingBookId(null);
      setNewBook({ isbn: '', title: '', author: '', category_id: '', location_id: '', stock: 0, price: 0 });
      showAlert(editingBookId ? 'Buku berhasil diperbarui!' : 'Buku berhasil ditambahkan!', 'success');
      fetchData();
    } else {
      showAlert('Gagal menyimpan data: ' + error.message, 'error');
    }
  };

  const handleEditClick = (book: Book) => {
    setEditingBookId(book.id);
    setNewBook({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      category_id: book.category_id || '',
      location_id: book.location_id || '',
      stock: book.stock,
      price: book.price
    });
    setIsModalOpen(true);
  };

  const deleteBook = (id: string) => {
    showConfirm({
      title: 'Hapus Buku',
      message: 'Apakah Anda yakin ingin menghapus buku ini dari katalog?',
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('books').delete().eq('id', id);
        if (!error) {
          showAlert('Buku telah dihapus', 'success');
          fetchData();
        } else {
          showAlert('Gagal menghapus: ' + error.message, 'error');
        }
      }
    });
  };

  const getStatusInfo = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-error-container text-on-error-container' };
    if (stock < 5) return { label: 'Low Stock', color: 'bg-warning-container text-on-warning-container' };
    return { label: 'Available', color: 'bg-green-100 text-green-800' };
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-background">Manajemen Buku</h2>
          <p className="font-body-sm text-body-sm text-secondary mt-1">Kelola katalog buku langsung dari database Supabase.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-2 rounded-full font-title-sm hover:bg-primary/90 transition-colors shadow-md flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Tambah Buku
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
          <p className="mt-4 text-secondary">Memuat data buku...</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="py-4 px-6 font-label-uppercase text-secondary uppercase">ISBN</th>
                  <th className="py-4 px-6 font-label-uppercase text-secondary uppercase">Judul</th>
                  <th className="py-4 px-6 font-label-uppercase text-secondary uppercase">Penulis</th>
                  <th className="py-4 px-6 font-label-uppercase text-secondary uppercase text-center">Stok</th>
                  <th className="py-4 px-6 font-label-uppercase text-secondary uppercase text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {books.map((book) => {
                  const status = getStatusInfo(book.stock);
                  return (
                    <tr key={book.id} className="hover:bg-surface-container-low/30 group transition-colors">
                      <td className="py-4 px-6 font-data-tabular text-on-surface">{book.isbn}</td>
                      <td className="py-4 px-6 font-body-md text-on-surface font-semibold">{book.title}</td>
                      <td className="py-4 px-6 font-body-md text-secondary">{book.author}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {book.stock} {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(book)}
                            className="p-2 hover:bg-surface-container rounded-lg text-secondary hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => deleteBook(book.id)}
                            className="p-2 hover:bg-surface-container rounded-lg text-secondary hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-sm text-primary">{editingBookId ? 'Edit Data Buku' : 'Tambah Buku Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddBook} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-uppercase text-secondary text-[11px]">ISBN</label>
                  <input required className="px-3 py-2 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary/20" value={newBook.isbn} onChange={e => setNewBook({...newBook, isbn: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-uppercase text-secondary text-[11px]">Kategori</label>
                  <select className="px-3 py-2 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary/20" value={newBook.category_id} onChange={e => setNewBook({...newBook, category_id: e.target.value})}>
                    <option value="">Pilih Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-uppercase text-secondary text-[11px]">Judul Buku</label>
                <input required className="px-3 py-2 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary/20" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-uppercase text-secondary text-[11px]">Penulis</label>
                <input required className="px-3 py-2 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary/20" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-uppercase text-secondary text-[11px]">Lokasi Rak</label>
                  <select className="px-3 py-2 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary/20" value={newBook.location_id} onChange={e => setNewBook({...newBook, location_id: e.target.value})}>
                    <option value="">Pilih Rak</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.rack_code}-{l.section}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-uppercase text-secondary text-[11px]">Stok Awal</label>
                  <input type="number" required className="px-3 py-2 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary/20" value={newBook.stock} onChange={e => setNewBook({...newBook, stock: parseInt(e.target.value) || 0})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-uppercase text-secondary text-[11px]">Harga (Rp)</label>
                  <input type="number" required className="px-3 py-2 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary/20" value={newBook.price} onChange={e => setNewBook({...newBook, price: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingBookId(null); }} className="flex-1 py-2 border border-outline-variant rounded-full text-secondary">Batal</button>
                <button type="submit" className="flex-1 py-2 bg-primary text-white rounded-full font-bold shadow-md">{editingBookId ? 'Perbarui' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BookManagementPage;
