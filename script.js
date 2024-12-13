document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewSection = document.getElementById('previewSection');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultSection = document.getElementById('resultSection');
    const loading = document.getElementById('loading');
    
    // 处理拖拽上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#2ecc71';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#3498db';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#3498db';
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // 处理文件选择
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // 处理文件
    function handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        if (!file.type.match('image.*')) {
            alert('请上传图片文件！');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('文件大小不能超过5MB！');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            previewSection.style.display = 'block';
            resultSection.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    // 分析按钮点击事件
    analyzeBtn.addEventListener('click', async () => {
        if (!imagePreview.src) {
            alert('请先上传图片！');
            return;
        }

        loading.style.display = 'block';
        analyzeBtn.disabled = true;

        try {
            const results = await analyzeFood(imagePreview.src);
            displayResults(results);
        } catch (error) {
            alert('分析失败，请重试！');
            console.error('Error:', error);
        } finally {
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    });

    // 显示结果
    function displayResults(results) {
        document.getElementById('foodName').textContent = results.foodName;
        document.getElementById('calories').textContent = results.calories;
        document.getElementById('nutritionAdvice').textContent = results.advice;
        resultSection.style.display = 'block';
    }
});

// 将图片转换为base64
async function getBase64FromUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// API调用函数
async function analyzeFood(imageUrl) {
    try {
        const base64Image = await getBase64FromUrl(imageUrl);
        console.log('图片已转换为base64格式');
        
        // 使用Google Cloud Vision API进行图像识别
        console.log('准备发送Vision API请求');
        const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${config.GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requests: [{
                    image: {
                        content: base64Image
                    },
                    features: [
                        {
                            type: 'LABEL_DETECTION',
                            maxResults: 5
                        },
                        {
                            type: 'OBJECT_LOCALIZATION',
                            maxResults: 5
                        }
                    ]
                }]
            })
        });

        if (!visionResponse.ok) {
            const errorData = await visionResponse.text();
            console.error('Vision API错误响应:', errorData);
            throw new Error('图像识别失败');
        }

        const visionData = await visionResponse.json();
        console.log('Vision API返回数据:', visionData);

        // 获取所有识别结果
        const labels = visionData.responses[0].labelAnnotations;
        
        // 需要过滤的通用词和类别
        const genericTerms = [
            // 通用词
            'food', 'meal', 'dish', 'cuisine', 'ingredient', 'produce', 'snack',
            'breakfast', 'lunch', 'dinner', 'recipe', 'cooking',
            // 食物类别
            'fruit', 'vegetable', 'meat', 'seafood', 'dessert', 'beverage',
            'dairy', 'grain', 'protein', 'carbohydrate', 'fat', 'sweet',
            'snack food', 'baked goods', 'processed food', 'natural food',
            'organic food', 'health food', 'junk food', 'fast food',
            'side dish', 'main course', 'appetizer', 'finger food',
            'comfort food', 'street food', 'takeout', 'homemade',
            // 烹饪方式
            'fried', 'baked', 'grilled', 'roasted', 'steamed', 'boiled',
            // 餐饮场合
            'restaurant', 'dining', 'catering', 'takeaway'
        ];
        
        // 提取具体的食物名称
        const foodResults = labels
            .filter(label => {
                const labelLower = label.description.toLowerCase();
                return !genericTerms.some(term => labelLower.includes(term.toLowerCase()));
            })
            .map(label => ({
                name: label.description,
                confidence: (label.score * 100).toFixed(2)
            }));

        console.log('过滤后的识别结果:', foodResults);

        // 如果没有具体食物名称，使用原始结果
        const mainResults = foodResults.length > 0 ? foodResults : labels.map(label => ({
            name: label.description,
            confidence: (label.score * 100).toFixed(2)
        }));

        // 基本食物卡路里估算（每100克）
        const basicCalories = {
            // 水果
            'apple': 52,
            'banana': 89,
            'orange': 47,
            'grape': 67,
            'watermelon': 30,
            'strawberry': 32,
            'pear': 57,
            'peach': 39,
            'mango': 60,
            'pineapple': 50,
            
            // 主食
            'rice': 130,
            'noodle': 138,
            'bread': 265,
            'pasta': 158,
            'bagel': 257,
            'croissant': 406,
            'pancake': 227,
            
            // 肉类
            'beef': 250,
            'pork': 242,
            'chicken': 165,
            'duck': 337,
            'lamb': 294,
            'turkey': 189,
            
            // 海鲜
            'fish': 100,
            'salmon': 208,
            'tuna': 184,
            'shrimp': 85,
            'crab': 97,
            'lobster': 89,
            
            // 蔬菜
            'tomato': 18,
            'potato': 77,
            'carrot': 41,
            'broccoli': 34,
            'cabbage': 25,
            'lettuce': 15,
            'cucumber': 15,
            'spinach': 23,
            'mushroom': 22,
            
            // 快餐
            'pizza': 266,
            'hamburger': 295,
            'sandwich': 250,
            'hotdog': 290,
            'french fries': 312,
            'nugget': 297,
            
            // 中餐
            'dumpling': 112,
            'spring roll': 154,
            'fried rice': 163,
            'chow mein': 159,
            
            // 日料
            'sushi': 150,
            'sashimi': 127,
            'tempura': 230,
            'ramen': 436,
            
            // 其他
            'egg': 155,
            'tofu': 76,
            'yogurt': 59,
            'cheese': 402,
            'milk': 42,
            'coffee': 1,
            'tea': 1,
            'ice cream': 207,
            'cake': 257,
            'cookie': 488,
            'chocolate': 546,
            'candy': 396
        };

        // 估算卡路里
        let estimatedCalories = null;
        for (const result of mainResults) {
            const foodName = result.name.toLowerCase();
            for (const [key, calories] of Object.entries(basicCalories)) {
                if (foodName.includes(key)) {
                    estimatedCalories = calories;
                    break;
                }
            }
            if (estimatedCalories) break;
        }

        // 生成建议
        let calorieInfo = '';
        if (estimatedCalories) {
            calorieInfo = `预估卡路里: ${estimatedCalories}卡路里/100克\n`;
            
            if (estimatedCalories > 300) {
                calorieInfo += '这是一种高热量食物，建议适量食用。';
            } else if (estimatedCalories > 150) {
                calorieInfo += '这是一种中等热量食物，可以适量食用。';
            } else {
                calorieInfo += '这是一种低热量食物，可以放心食用。';
            }
        } else {
            calorieInfo = '无法准确估算卡路里含量';
        }

        // 获取最高置信度的具体食物名称
        const topResult = mainResults[0];
        const resultText = `${topResult.name} (置信度: ${topResult.confidence}%)`;

        return {
            foodName: resultText,
            calories: calorieInfo,
            advice: '注意：卡路里估算仅供参考，实际值可能因食材、烹饪方法等因素而异。建议咨询营养师获取更准确的建议。'
        };
    } catch (error) {
        console.error('详细错误信息:', error);
        throw error;
    }
}
