import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  IconButton,
  Chip,
  Box,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tab,
  Tabs
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { FaCat, FaShoppingCart, FaTrash, FaPlus, FaStar, FaHistory } from 'react-icons/fa';
import { MdExpandMore } from 'react-icons/md';

// הגדרת תמיכה מלאה ב-RTL עבור Material UI
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// עיצוב כהה ואלגנטי
const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffb74d',
    },
    secondary: {
      main: '#81c784',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0bec5',
    },
  },
  typography: {
    fontFamily: 'Assistant, Rubik, sans-serif',
  },
});

const DEFAULT_CATEGORIES = [
  'ירקות ופירות',
  'מוצרי מקרר',
  'מעדנייה',
  'מוצרים יבשים',
  'מוצרים קפואים',
  'אחר'
];

export default function App() {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeTab, setActiveTab] = useState(0);

  // סנכרון בזמן אמת מול Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'shopping-list'), (snapshot) => {
      const fetchedItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // מחיקת מוצרים ישנים מ-30 יום
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      fetchedItems.forEach(async (item) => {
        if (item.bought && item.boughtAt && item.boughtAt < thirtyDaysAgo) {
          await deleteDoc(doc(db, 'shopping-list', item.id));
        }
      });

      setItems(fetchedItems);

      const usedCategories = new Set(DEFAULT_CATEGORIES);
      fetchedItems.forEach(item => {
        if (item.category) usedCategories.add(item.category);
      });
      setCategories(Array.from(usedCategories));
    });

    return () => unsubscribe();
  }, []);

  // מוצרים בתדירות גבוהה
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

  // היסטוריית מוצרים להשלמה אוטומטית
  const historySuggestions = useMemo(() => {
    const names = items.map((i) => i.name.trim());
    return Array.from(new Set(names));
  }, [items]);

  // הוספת פריט
  const handleAddItem = async (e) => {
    if (e) e.preventDefault();
    if (!itemName.trim()) return;

    const finalCategory = isAddingCustomCategory && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    const existingItem = items.find(
      (i) => i.name.trim().toLowerCase() === itemName.trim().toLowerCase()
    );

    if (existingItem) {
      if (existingItem.bought) {
        await updateDoc(doc(db, 'shopping-list', existingItem.id), {
          bought: false,
          boughtAt: null,
          category: finalCategory
        });
      }
    } else {
      await addDoc(collection(db, 'shopping-list'), {
        name: itemName.trim(),
        category: finalCategory,
        bought: false,
        buyCount: 1,
        createdAt: Date.now(),
        boughtAt: null
      });
    }

    setItemName('');
    setCustomCategory('');
    setIsAddingCustomCategory(false);
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

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <Box
          dir="rtl"
          sx={{
            minHeight: '100vh',
            backgroundColor: 'background.default',
            color: 'text.primary',
            py: 3,
            px: 2
          }}
        >
          <Container maxWidth="sm">
            {/* כותרת נקייה ומקצועית */}
            <Paper
              elevation={2}
              sx={{
                p: 2,
                mb: 2.5,
                borderRadius: 3,
                textAlign: 'center',
                backgroundColor: '#1e1e1e',
                border: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5
              }}
            >
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#ffb74d' }}>
                קופץ לסופר
              </Typography>
              <FaCat size={28} color="#ffb74d" />
            </Paper>

            {/* טופס הוספת פריט */}
            <Paper elevation={2} sx={{ p: 2, mb: 2.5, borderRadius: 3, border: '1px solid #333' }}>
              <form onSubmit={handleAddItem}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Autocomplete
                    freeSolo
                    options={historySuggestions}
                    value={itemName}
                    onInputChange={(event, newValue) => setItemName(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="מה להוסיף לרשימה?"
                        variant="outlined"
                        fullWidth
                        size="small"
                      />
                    )}
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!isAddingCustomCategory ? (
                      <FormControl fullWidth size="small">
                        <InputLabel id="category-select-label">קטגוריה</InputLabel>
                        <Select
                        MenuProps={{ dir: 'rtl' }}
                          labelId="category-select-label"
                          value={category}
                          label="קטגוריה"
                          onChange={(e) => {
                            if (e.target.value === 'NEW') {
                              setIsAddingCustomCategory(true);
                            } else {
                              setCategory(e.target.value);
                            }
                          }}
                        >
                          {categories.map((cat) => (
                            <MenuItem key={cat} value={cat}>
                              {cat}
                            </MenuItem>
                          ))}
                          <Divider />
                          <MenuItem value="NEW" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                            + קטגוריה חדשה
                          </MenuItem>
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        label="שם הקטגוריה"
                        size="small"
                        fullWidth
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                      />
                    )}

                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={<FaPlus />}
                      sx={{ px: 3, fontWeight: 'bold', minWidth: '90px', borderRadius: 2 }}
                    >
                      הוסף
                    </Button>
                  </Box>
                </Box>
              </form>
            </Paper>

            {/* ניווט בלשוניות */}
            <Paper sx={{ mb: 2, borderRadius: 2, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab
                  label={
                    <Badge badgeContent={activeItems.length} color="primary" sx={{ '& .MuiBadge-badge': { right: -10, top: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <FaShoppingCart size={14} /> לקנות
                      </Box>
                    </Badge>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <FaStar size={14} color="#ffb74d" /> נפוצים
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <FaHistory size={14} /> נקנו
                    </Box>
                  }
                />
              </Tabs>
            </Paper>

            {/* לשונית 0: רשימת קניות */}
            {activeTab === 0 && (
              <Box>
                {activeItems.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
                    <Typography color="text.secondary" variant="body2">
                      הרשימה ריקה
                    </Typography>
                  </Paper>
                ) : (
                  categories.map((cat) => {
                    const catItems = activeItems.filter((i) => i.category === cat);
                    if (catItems.length === 0) return null;

                    return (
                      <Accordion defaultExpanded key={cat} sx={{ mb: 1.5, bgcolor: '#1e1e1e', borderRadius: '8px !important', border: '1px solid #333' }}>
                        <AccordionSummary expandIcon={<MdExpandMore />}>
                          <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                            {cat} ({catItems.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          <List disablePadding>
                            {catItems.map((item) => (
                              <ListItem
                                key={item.id}
                                divider
                                sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Checkbox
                                    edge="start"
                                    checked={item.bought}
                                    onChange={() => toggleBought(item)}
                                    color="secondary"
                                    size="small"
                                  />
                                  <ListItemText
                                    primary={item.name}
                                    primaryTypographyProps={{ fontSize: '1rem' }}
                                  />
                                </Box>
                                <IconButton edge="end" onClick={() => handleDelete(item.id)} color="error" size="small">
                                  <FaTrash size={14} />
                                </IconButton>
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

            {/* לשונית 1: מוצרים נפוצים */}
            {activeTab === 1 && (
              <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                  מוצרים שנקנים בתדירות גבוהה
                </Typography>
                {frequentItems.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    מוצרים שתרכשו מספר פעמים יופיעו כאן להוספה מהירה.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {frequentItems.map((freq) => {
                      const isAlreadyActive = activeItems.some(
                        (i) => i.name.trim().toLowerCase() === freq.name.toLowerCase()
                      );

                      return (
                        <Chip
                          key={freq.name}
                          label={`${freq.name} (${freq.category})`}
                          onClick={async () => {
                            if (!isAlreadyActive) {
                              setItemName(freq.name);
                              setCategory(freq.category);
                              setActiveTab(0);
                            }
                          }}
                          color={isAlreadyActive ? 'default' : 'primary'}
                          variant={isAlreadyActive ? 'outlined' : 'filled'}
                          icon={<FaPlus size={12} />}
                          sx={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Box>
                )}
              </Paper>
            )}

            {/* לשונית 2: נקנו לאחרונה */}
            {activeTab === 2 && (
              <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: 'secondary.main', fontWeight: 'bold' }}>
                  נקנו לאחרונה (נשמרים ל-30 ימים)
                </Typography>
                {boughtItems.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    אין פריטים שסומנו כנקנו.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {boughtItems.map((item) => (
                      <ListItem
                        key={item.id}
                        divider
                        sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 1 }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Checkbox
                            edge="start"
                            checked={item.bought}
                            onChange={() => toggleBought(item)}
                            color="secondary"
                            size="small"
                          />
                          <ListItemText
                            primary={item.name}
                            secondary={`קטגוריה: ${item.category}`}
                            sx={{ textDecoration: 'line-through', opacity: 0.6 }}
                          />
                        </Box>
                        <IconButton edge="end" onClick={() => handleDelete(item.id)} color="error" size="small">
                          <FaTrash size={14} />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            )}
          </Container>
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}