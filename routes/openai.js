import express from 'express';
import OpenAI from 'openai';
import Recipe from '../models/Recipe.js';
import Exercise from '../models/Exercise.js';
import WorkoutPlan from '../models/WorkoutPlan.js';
import auth from '../middleware/auth.js';

const router = express.Router();

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

router.post('/generate-recipe', auth, async (req, res) => {
  try {
    const client = getClient();
    if (!client) {
      return res.status(400).json({ message: 'OPENAI_API_KEY no configurada. Configurala en server/.env' });
    }
    const { ingredients, mealType, preferences, recipeStyle, description, pantryIngredients } = req.body;
    const hasIngredients = ingredients && ingredients.length > 0;
    const hasDescription = description && description.trim();

    const styleDesc = recipeStyle ? {
      'facil': 'Receta fácil y rápida, con pocos pasos y técnicas simples.',
      'medio': 'Receta de dificultad media, con algunas técnicas culinarias.',
      'gourmet': 'Receta gourmet, elaborada, con presentación profesional y sabores sofisticados.'
    }[recipeStyle] : '';

    const targetDesc = preferences || '';

    let prompt;
    if (hasDescription && pantryIngredients?.length > 0) {
      prompt = `Eres un chef profesional. El usuario describe lo que quiere: "${description}".
Tiene estos ingredientes disponibles en su despensa: ${pantryIngredients.join(', ')}.
Creá una receta usando principalmente los ingredientes de su despensa. Podés agregar ingredientes básicos adicionales (sal, aceite, condimentos) si hace falta.
Tipo de comida: ${mealType || 'cualquiera'}
${styleDesc ? `Estilo: ${styleDesc}\n` : ''}
${targetDesc ? `Preferencias: ${targetDesc}\n` : ''}
`;
    } else {
      prompt = (hasIngredients
        ? `Eres un chef profesional. Crea una receta detallada usando estos ingredientes: ${ingredients.join(', ')}.\n`
        : `Eres un chef profesional. Crea una receta original y deliciosa.\n`) +
        `Tipo de comida: ${mealType || 'cualquiera'}\n` +
        (styleDesc ? `Estilo: ${styleDesc}\n` : '') +
        (targetDesc ? `Preferencias: ${targetDesc}\n` : '');
    }

    prompt += `\nResponde en el siguiente formato JSON (sin markdown, solo JSON):
  "name": "Nombre de la receta",
  "description": "Breve descripción apetitosa",
  "ingredients": [
    {"name": "ingrediente", "amount": "cantidad", "unit": "unidad", "calories": 0}
  ],
  "instructions": "Instrucciones detalladas paso a paso",
  "prepTime": 15,
  "cookTime": 30,
  "servings": 2,
  "calories": 400,
  "protein": 20,
  "carbs": 30,
  "fats": 15,
  "tags": ["tag1", "tag2"],
  "mealType": "${mealType || 'cualquiera'}"
}

Importante: Incluye las calorías aproximadas de CADA ingrediente segun la cantidad usada. El total de calorias (campo "calories") debe ser la suma de las calorias de todos los ingredientes.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un chef profesional que crea recetas deliciosas y saludables.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content;
    let recipeData;
    try {
      const cleaned = responseText.replace(/```json|```/g, '').trim();
      recipeData = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ message: 'Error al procesar la respuesta de la IA', raw: responseText });
    }

    const recipe = await Recipe.create({
      ...recipeData,
      createdBy: req.user._id,
      isAIGenerated: true
    });

    res.status(201).json(recipe);
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({ message: 'Error de autenticación con OpenAI. Verifica tu API key.' });
    }
    res.status(500).json({ message: error.message });
  }
});

router.post('/generate-workout', auth, async (req, res) => {
  try {
    const client = getClient();
    if (!client) {
      return res.status(400).json({ message: 'OPENAI_API_KEY no configurada. Configurala en server/.env' });
    }

    const { goal, daysPerWeek, durationMinutes, difficulty, equipment, focus, preferences } = req.body;

    const prompt = `Eres un entrenador personal profesional. Creá un plan de entrenamiento semanal con las siguientes características:
Objetivo: ${goal || 'tonificar'}
Días por semana: ${daysPerWeek || 3}
Duración por sesión: ${durationMinutes || 45} minutos
Dificultad: ${difficulty || 'principiante'}
Equipo disponible: ${equipment || 'cuerpo-libre'}
Enfoque: ${focus || 'cuerpo-completo'}
${preferences ? `Preferencias: ${preferences}` : ''}

Respondé SOLO con un JSON válido (sin markdown):
{
  "name": "Nombre del plan",
  "description": "Descripción del plan",
  "days": [
    {
      "name": "Día 1 - [nombre]",
      "exercises": [
        { "name": "Nombre del ejercicio", "sets": 3, "reps": "10-12", "restSeconds": 60, "notes": "Técnica" }
      ]
    }
  ],
  "difficulty": "${difficulty || 'principiante'}",
  "durationWeeks": 4,
  "tags": ["tag1", "tag2"]
}

Incluí de 4 a 8 ejercicios por día. Cada ejercicio debe tener nombre real y datos de series/repeticiones coherentes.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un entrenador personal profesional que diseña rutinas de ejercicio efectivas y seguras.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2500
    });

    const responseText = completion.choices[0].message.content;
    let planData;
    try {
      const cleaned = responseText.replace(/```json|```/g, '').trim();
      planData = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ message: 'Error al procesar la respuesta de la IA', raw: responseText });
    }

    const exerciseNames = new Set();
    for (const day of planData.days || []) {
      for (const ex of day.exercises || []) {
        if (ex.name) exerciseNames.add(ex.name);
      }
    }

    const existingExercises = await Exercise.find({ name: { $in: [...exerciseNames] } });
    const existingMap = {};
    for (const ex of existingExercises) existingMap[String(ex.name).toLowerCase()] = ex._id;

    const createdExercises = [];
    for (const name of exerciseNames) {
      const key = String(name).toLowerCase();
      if (!existingMap[key]) {
        const ex = await Exercise.create({
          name,
          description: `Ejercicio generado por IA para: ${planData.name}`,
          createdBy: req.user._id,
          isAIGenerated: true
        });
        existingMap[key] = ex._id;
        createdExercises.push(ex);
      }
    }

    for (const day of planData.days || []) {
      for (const ex of day.exercises || []) {
        ex.exercise = existingMap[String(ex.name).toLowerCase()];
      }
    }

    const plan = await WorkoutPlan.create({
      ...planData,
      createdBy: req.user._id,
      isAIGenerated: true,
      assignedTo: req.body.assignedTo || null
    });

    const populated = await WorkoutPlan.findById(plan._id).populate('days.exercises.exercise');
    res.status(201).json(populated);
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({ message: 'Error de autenticación con OpenAI. Verifica tu API key.' });
    }
    res.status(500).json({ message: error.message });
  }
});

router.post('/generate-exercise', auth, async (req, res) => {
  try {
    const client = getClient();
    if (!client) {
      return res.status(400).json({ message: 'OPENAI_API_KEY no configurada' });
    }

    const { description, muscleGroup } = req.body;

    const prompt = `Eres un entrenador personal profesional. Creá un ejercicio físico basado en esta descripción: "${description}"
${muscleGroup && muscleGroup !== 'cualquiera' ? `Grupo muscular: ${muscleGroup}` : ''}

Respondé SOLO con un JSON válido (sin markdown):
{
  "name": "Nombre del ejercicio",
  "description": "Descripción breve de cómo se hace",
  "muscleGroup": "grupo muscular principal",
  "equipment": "equipo necesario (ninguno/cuerpo-libre/mancuernas/barra/maquina/cable/banda)",
  "difficulty": "principiante/intermedio/avanzado",
  "instructions": "Instrucciones detalladas paso a paso para realizar el ejercicio correctamente"
}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un entrenador personal profesional que diseña ejercicios efectivos y seguros.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content;
    let exerciseData;
    try {
      const cleaned = responseText.replace(/```json|```/g, '').trim();
      exerciseData = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ message: 'Error al procesar la respuesta de la IA', raw: responseText });
    }

    const exercise = await Exercise.create({
      ...exerciseData,
      createdBy: req.user._id,
      isAIGenerated: true
    });

    res.status(201).json(exercise);
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({ message: 'Error de autenticación con OpenAI' });
    }
    res.status(500).json({ message: error.message });
  }
});

router.post('/analyze-image', auth, async (req, res) => {
  try {
    const client = getClient();
    if (!client) {
      return res.status(400).json({ message: 'OPENAI_API_KEY no configurada. Configurala en server/.env' });
    }

    const { image, notes } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'Imagen requerida (base64)' });
    }

    const userNotes = notes && notes.trim() ? `\n\nInformación adicional del usuario: "${notes.trim()}"` : '';
    const prompt = `Analizá esta imagen de comida y respondé SOLO con un JSON válido (sin markdown) con esta estructura:${userNotes}
{
  "name": "Nombre del plato/comida en español",
  "description": "Breve descripción de lo que se ve en el plato",
  "estimatedCalories": 350,
  "protein": 20,
  "carbs": 30,
  "fats": 10,
  "ingredients": [
    { "name": "ingrediente", "estimatedAmount": "cantidad aproximada", "unit": "unidad" }
  ],
  "mealType": "desayuno/almuerzo/merienda/cena/colacion",
  "tags": ["tag1", "tag2"]
}

Sé lo más preciso posible con las calorías y macros estimadas basándote en las porciones visibles. Si no podés determinar algún valor exacto, da una estimación razonable.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}`, detail: 'low' } }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content;
    let data;
    try {
      const cleaned = responseText.replace(/```json|```/g, '').trim();
      data = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ message: 'Error al procesar la respuesta de la IA', raw: responseText });
    }

    res.json(data);
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({ message: 'Error de autenticación con OpenAI. Verifica tu API key.' });
    }
    res.status(500).json({ message: error.message });
  }
});

router.post('/analyze-text', auth, async (req, res) => {
  try {
    const client = getClient();
    if (!client) {
      return res.status(400).json({ message: 'OPENAI_API_KEY no configurada.' });
    }
    const { text, mealType } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Texto requerido' });
    }

    const prompt = `Interpretá la siguiente descripción de comida y respondé SOLO con un JSON válido (sin markdown) con esta estructura:
{
  "name": "Nombre del plato/comida en español",
  "estimatedCalories": 250,
  "protein": 15,
  "carbs": 30,
  "fats": 8,
  "mealType": "desayuno/almuerzo/merienda/cena/colacion",
  "tags": ["tag1", "tag2"]
}

Descripción del usuario: "${text.trim()}"
${mealType ? `El usuario indica que es para: ${mealType}` : 'Determiná el tipo de comida según la descripción'}

Estimá las calorías y macros aproximados según las porciones típicas. Si no se especifica cantidad, asumí una porción estándar. Sé preciso pero si no tenés certeza, da una estimación razonable.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800
    });

    const responseText = completion.choices[0].message.content;
    let data;
    try {
      const cleaned = responseText.replace(/```json|```/g, '').trim();
      data = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ message: 'Error al procesar la respuesta de la IA', raw: responseText });
    }

    res.json(data);
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({ message: 'Error de autenticación con OpenAI.' });
    }
    res.status(500).json({ message: error.message });
  }
});

export default router;
