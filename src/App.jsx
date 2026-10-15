import React, { useState, useEffect, useMemo } from 'react';
import { db, storage } from './firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Container, Paper, Typography, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, Checkbox, IconButton, Chip, Box, Divider,
  List, ListItem, ListItemText, Autocomplete, Accordion,
  AccordionSummary, AccordionDetails, Badge, Tab, Tabs,
  Dialog, DialogContent, CircularProgress
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { 
  FaCat, FaShoppingCart, FaTrash, FaPlus, FaStar, 
  FaHistory, FaCamera, FaImage 
} from 'react-icons/fa';
import { MdExpandMore } from 'react-icons/md';

const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'dark',
    primary: { main: '#ffb74d' },
    secondary: { main: '#81c784' },
    background: { default: '#121212', paper: '#1e1e1e' },
    text: { primary: '#ffffff', secondary: '#b0bec5' },
  },
  typography: { fontFamily: 'Assistant, Rubik, sans-serif' },
});

const DEFAULT_CATEGORIES = ['ירקות ופירות', 'מוצרי מקרר', 'מעדנייה', 'מוצרים יבשים', 'מוצרים קפואים', 'אחר'];
const FAMILY_PASSWORD = "תקווה"; // הסיסמה המשפחתית

export default function App() {
  // === הגדרות מצב (States) ===
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // בודק אם כבר התחברנו בעבר באותו טלפון
    return localStorage.getItem('kofetz-logged-in') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeTab, setActiveTab] = useState(0);

  // מצבי תמונה
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewImage, setViewImage] = useState(null); // URL של תמונה להצגה בגדול

  // === סנכרון נתונים (Hooks) ===
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'shopping-list'), (snapshot) => {
      const fetchedItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      
      fetchedItems.forEach(async (item) => {
        if (item.bought && item.boughtAt && item.boughtAt < thirtyDaysAgo) {
          await deleteDoc(doc(db, 'shopping-list', item.id));
        }
      });

      setItems(fetchedItems);

      const usedCategories = new Set(DEFAULT_CATEGORIES);
      fetchedItems.forEach(item => { if (item.category) usedCategories.add(item.category); });
      setCategories(Array.from(usedCategories));
    });
    return () => unsubscribe();
  }, []);

  const frequentItems = useMemo(() => {
    const counts = {};
    items.forEach((item) => {
      const key = item.name.trim();
      counts[key] = (counts[key] || 0) + (item.buyCount || 1);
    });
    return Object.entries(counts)
      .filter(([_, count]) => count >= 2)
      .map(([name]) => {
        const existing = items.find((i) => i.name.trim() === name);
        return { name, category: existing ? existing.category : 'אחר' };
      });
  }, [items]);

  const historySuggestions = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.name.trim())));
  }, [items]);

  // === פונקציות פעולה ===
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === FAMILY_PASSWORD) {
      setIsLoggedIn(true);
      localStorage.setItem('kofetz-logged-in', 'true');
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  const handleAddItem = async (e) => {
    if (e) e.preventDefault();
    if (!itemName.trim()) return;

    setIsUploading(true);
    const finalCategory = isAddingCustomCategory && customCategory.trim() ? customCategory.trim() : category;

    // העלאת תמונה אם יש
    let imageUrl = null;
    if (imageFile) {
      const imageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);
    }

    const existingItem = items.find(i => i.name.trim().toLowerCase() === itemName.trim().toLowerCase() && !i.bought);

    if (existingItem) {
      // אם כבר קיים ברשימה, רק נעדכן כמות או תמונה
      await updateDoc(doc(db, 'shopping-list', existingItem.id), {
        quantity: existingItem.quantity + Number(quantity),
        imageUrl: imageUrl || existingItem.imageUrl
      });
    } else {
      await addDoc(collection(db, 'shopping-list'), {
        name: itemName.trim(),
        category: finalCategory,
        quantity: Number(quantity) || 1,
        imageUrl: imageUrl,
        bought: false,
        buyCount: 1,
        createdAt: Date.now(),
        boughtAt: null
      });
    }

    setItemName('');
    setQuantity(1);
    setImageFile(null);
    setCustomCategory('');
    setIsAddingCustomCategory(false);
    setIsUploading(false);
  };

  const toggleBought = async (item) => {
    const isNowBought = !item.bought;
    await updateDoc(doc(db, 'shopping-list', item.id), {
      bought: isNowBought,
      boughtAt: isNowBought ? Date.now() : null,
      buyCount: isNowBought ? (item.buyCount || 1) + 1 : item.buyCount || 1
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'shopping-list', id));
  };

  const activeItems = items.filter((i) => !i.bought);
  const boughtItems = items.filter((i) => i.bought);

  // === תצוגה מרכזית ===
  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        {!isLoggedIn ? (
          /* -------- מסך התחברות -------- */
          <Box dir="rtl" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
            <Paper elevation={4} sx={{ p: 4, borderRadius: 3, textAlign: 'center', bgcolor: '#1e1e1e', border: '1px solid #333', maxWidth: '400px', width: '100%' }}>
              <FaCat size={40} color="#ffb74d" style={{ marginBottom: '16px' }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ffb74d', mb: 1 }}>
                קופץ לסופר
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                האפליקציה סגורה למשפחה בלבד. אנא הזינו את הסיסמה.
              </Typography>
              <form onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  label="סיסמה"
                  type="password"
                  variant="outlined"
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setLoginError(false); }}
                  error={loginError}
                  helperText={loginError ? "סיסמה שגויה, נסו שוב 🐾" : ""}
                  sx={{ mb: 3 }}
                />
                <Button type="submit" fullWidth variant="contained" color="primary" sx={{ py: 1.5, fontWeight: 'bold', fontSize: '1.1rem' }}>
                  כניסה
                </Button>
              </form>
            </Paper>
          </Box>
        ) : (
          /* -------- האפליקציה המרכזית -------- */
          <Box dir="rtl" sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', py: 3, px: 2 }}>
            <Container maxWidth="sm">
              <Paper elevation={2} sx={{ p: 2, mb: 2.5, borderRadius: 3, textAlign: 'center', bgcolor: '#1e1e1e', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                <FaCat size={28} color="#ffb74d" />
                <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#ffb74d' }}>קופץ לסופר</Typography>
              </Paper>

              <Paper elevation={2} sx={{ p: 2, mb: 2.5, borderRadius: 3, border: '1px solid #333' }}>
                <form onSubmit={handleAddItem}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Autocomplete
                        freeSolo
                        options={historySuggestions}
                        value={itemName}
                        onInputChange={(e, newValue) => setItemName(newValue)}
                        slotProps={{ listbox: { dir: 'rtl' } }}
                        sx={{ flexGrow: 1 }}
                        renderInput={(params) => (
                          <TextField {...params} label="מה להוסיף לרשימה?" variant="outlined" size="small" required />
                        )}
                      />
                      <TextField
                        label="כמות"
                        type="number"
                        size="small"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        slotProps={{ htmlInput: { min: 1 } }}
                        sx={{ width: '70px' }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {!isAddingCustomCategory ? (
                        <FormControl fullWidth size="small">
                          <InputLabel id="cat-label">קטגוריה</InputLabel>
                          <Select labelId="cat-label" value={category} MenuProps={{ dir: 'rtl' }} label="קטגוריה" onChange={(e) => e.target.value === 'NEW' ? setIsAddingCustomCategory(true) : setCategory(e.target.value)}>
                            {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                            <Divider />
                            <MenuItem value="NEW" sx={{ color: 'primary.main', fontWeight: 'bold' }}>+ קטגוריה חדשה</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField label="שם הקטגוריה" size="small" fullWidth value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
                      )}

                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="icon-button-file"
                        type="file"
                        onChange={(e) => setImageFile(e.target.files[0])}
                      />
                      <label htmlFor="icon-button-file">
                        <IconButton color={imageFile ? "primary" : "secondary"} component="span" sx={{ border: '1px solid #333', borderRadius: 2 }}>
                          <FaCamera size={18} />
                        </IconButton>
                      </label>

                      <Button type="submit" variant="contained" color="primary" disabled={isUploading} sx={{ px: 3, fontWeight: 'bold', minWidth: '90px', borderRadius: 2 }}>
                        {isUploading ? <CircularProgress size={24} color="inherit" /> : 'הוסף'}
                      </Button>
                    </Box>
                    {imageFile && <Typography variant="caption" color="primary">✓ נבחרה תמונה: {imageFile.name}</Typography>}
                  </Box>
                </form>
              </Paper>

              <Paper sx={{ mb: 2, borderRadius: 2, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
                <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} variant="fullWidth" textColor="primary" indicatorColor="primary">
                  <Tab 
                    icon={<Badge badgeContent={activeItems.length} color="primary"><FaShoppingCart size={20} /></Badge>} 
                    iconPosition="start" 
                    label="לקנות" 
                    sx={{ minHeight: '60px' }}
                  />
                  <Tab icon={<FaStar size={18} color="#ffb74d" />} iconPosition="start" label="נפוצים" sx={{ minHeight: '60px' }} />
                  <Tab icon={<FaHistory size={18} />} iconPosition="start" label="נקנו" sx={{ minHeight: '60px' }} />
                </Tabs>
              </Paper>

              {activeTab === 0 && (
                <Box>
                  {activeItems.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3, bgcolor: '#1e1e1e', border: '1px solid #333' }}><Typography color="text.secondary" variant="body2">הרשימה ריקה</Typography></Paper>
                  ) : (
                    categories.map((cat) => {
                      const catItems = activeItems.filter((i) => i.category === cat);
                      if (catItems.length === 0) return null;
                      return (
                        <Accordion defaultExpanded key={cat} sx={{ mb: 1.5, bgcolor: '#1e1e1e', borderRadius: '8px !important', border: '1px solid #333' }}>
                          <AccordionSummary expandIcon={<MdExpandMore />}>
                            <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{cat} ({catItems.length})</Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 0 }}>
                            <List disablePadding>
                              {catItems.map((item) => (
                                <ListItem key={item.id} divider sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Checkbox edge="start" checked={item.bought} onChange={() => toggleBought(item)} color="secondary" size="small" />
                                    <ListItemText 
                                      primary={item.quantity > 1 ? `${item.name} (${item.quantity})` : item.name} 
                                      slotProps={{ primary: { sx: { fontSize: '1rem' } } }}
                                    />
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {item.imageUrl && (
                                      <IconButton size="small" color="primary" onClick={() => setViewImage(item.imageUrl)}>
                                        <FaImage size={18} />
                                      </IconButton>
                                    )}
                                    <IconButton edge="end" onClick={() => handleDelete(item.id)} color="error" size="small"><FaTrash size={14} /></IconButton>
                                  </Box>
                                </ListItem>
                              ))}
                            </List>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })
                  )}
                </Box>
              )}

              {activeTab === 1 && (
                <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>מוצרים שנקנים בתדירות גבוהה</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {frequentItems.map((freq) => {
                      const isAlreadyActive = activeItems.some(i => i.name.trim().toLowerCase() === freq.name.toLowerCase());
                      return (
                        <Chip key={freq.name} label={`${freq.name} (${freq.category})`} onClick={() => { if (!isAlreadyActive) { setItemName(freq.name); setCategory(freq.category); setActiveTab(0); } }} color={isAlreadyActive ? 'default' : 'primary'} variant={isAlreadyActive ? 'outlined' : 'filled'} icon={<FaPlus size={12} />} sx={{ cursor: 'pointer' }} />
                      );
                    })}
                  </Box>
                </Paper>
              )}

              {activeTab === 2 && (
                <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, color: 'secondary.main', fontWeight: 'bold' }}>נקנו לאחרונה</Typography>
                  <List disablePadding>
                    {boughtItems.map((item) => (
                      <ListItem key={item.id} divider sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Checkbox edge="start" checked={item.bought} onChange={() => toggleBought(item)} color="secondary" size="small" />
                          <ListItemText primary={item.name} secondary={`קטגוריה: ${item.category}`} sx={{ textDecoration: 'line-through', opacity: 0.6 }} />
                        </Box>
                        <IconButton edge="end" onClick={() => handleDelete(item.id)} color="error" size="small"><FaTrash size={14} /></IconButton>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              <Dialog open={!!viewImage} onClose={() => setViewImage(null)} maxWidth="sm" fullWidth>
                <DialogContent sx={{ p: 0, bgcolor: '#000', display: 'flex', justifyContent: 'center' }}>
                  {viewImage && <img src={viewImage} alt="מוצר" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />}
                </DialogContent>
              </Dialog>
              
            </Container>
          </Box>
        )}
      </ThemeProvider>
    </CacheProvider>
  );
}