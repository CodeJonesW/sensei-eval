# Understanding Neural Networks: From Neurons to Layers

The human brain processes information through billions of interconnected neurons. Neural networks take this biological inspiration and turn it into math you can run on a GPU. Let's build the intuition from scratch.

## What Is a Neuron?

A single artificial neuron does three things:
1. Takes weighted inputs
2. Sums them up (with a bias)
3. Passes the result through an activation function

```python
import numpy as np

def neuron(inputs, weights, bias):
    """A single artificial neuron."""
    z = np.dot(inputs, weights) + bias
    return max(0, z)  # ReLU activation

# Example: 3 inputs
inputs = np.array([1.0, 2.0, 3.0])
weights = np.array([0.5, -0.3, 0.8])
bias = 0.1

output = neuron(inputs, weights, bias)
print(f"Neuron output: {output}")  # 2.0
```

The key insight: **weights determine what the neuron pays attention to**. A large positive weight means "this input matters a lot," while a negative weight means "less of this, please."

## From Neurons to Layers

A layer is just multiple neurons processing the same inputs in parallel. Each neuron learns different features:

```python
def dense_layer(inputs, weight_matrix, biases):
    """A fully connected layer of neurons."""
    z = np.dot(inputs, weight_matrix) + biases
    return np.maximum(0, z)  # ReLU for each neuron

# 3 inputs → 4 neurons
weights = np.random.randn(3, 4) * 0.1
biases = np.zeros(4)
layer_output = dense_layer(inputs, weights, biases)
print(f"Layer output shape: {layer_output.shape}")  # (4,)
```

## Stacking Layers: The "Deep" in Deep Learning

Stack multiple layers and each one transforms the data into a more useful representation:

```python
def forward_pass(x, layers):
    """Pass input through multiple layers."""
    for weights, biases in layers:
        x = dense_layer(x, weights, biases)
    return x
```

Layer 1 might detect edges. Layer 2 combines edges into shapes. Layer 3 combines shapes into objects. Each layer builds on the previous one's abstractions.

## Try It Yourself

Modify the `neuron` function to use a sigmoid activation instead of ReLU:

```python
def sigmoid(z):
    return 1 / (1 + np.exp(-z))
```

When would you choose sigmoid over ReLU? Think about the output range each one produces.

## Key Takeaways

- A neuron is weighted sum + bias + activation function
- Layers are parallel neurons learning different features
- Depth lets the network build hierarchical representations
- The activation function introduces non-linearity — without it, stacking layers would just be matrix multiplication
