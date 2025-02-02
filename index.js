const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8000;

app.get('/api/hello', (req, res) => {
  res.json({ message: "Hello from Vercel Serverless!" });
});

app.use(cors());
app.use(bodyParser.json());

const connectionURL = "mongodb+srv://shaheeruddin:Shaheer123@cluster0.uuj4z.mongodb.net"
mongoose.connect(`${connectionURL}/cart-system`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true }
});

const Product = mongoose.model('Product', productSchema);

const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true, min: 1 }
  }]
});

const Cart = mongoose.model('Cart', cartSchema);

const validateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.body.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// API Routes

app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/cart', validateProduct, async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    const existingProduct = cart.products.find(p => p.productId.toString() === productId);

    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({ productId, quantity });
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/cart', validateProduct, async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const productIndex = cart.products.findIndex(p => p.productId.toString() === productId);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found in cart' });
    }

    cart.products[productIndex].quantity = quantity;
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/cart', async (req, res) => {
  try {
    const { userId, productId } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.products = cart.products.filter(p => p.productId.toString() !== productId);
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/cart/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate('products.productId');
    if (!cart) {
      return res.json({ products: [], total: 0 });
    }

    const total = cart.products.reduce((sum, item) => {
      return sum + (item.productId.price * item.quantity);
    }, 0);

    res.json({ cart, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const seedProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      const sampleProducts = [
        {
          name: "Laptop",
          price: 999.99,
          description: "High-performance laptop with 16GB RAM"
        },
        {
          name: "Smartphone",
          price: 699.99,
          description: "Latest model with 5G capability"
        },
        {
          name: "Headphones",
          price: 199.99,
          description: "Noise-cancelling wireless headphones"
        },
        {
          name: "Tablet",
          price: 449.99,
          description: "10-inch display with stylus support"
        },
        {
          name: "Smartwatch",
          price: 299.99,
          description: "Fitness tracking and notifications"
        }
      ];

      await Product.insertMany(sampleProducts);
      console.log('Sample products seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

seedProducts();


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});