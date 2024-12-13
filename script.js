const MAX_FREE_USES = 20;
const STORAGE_KEYS = {
    REMAINING_USES: 'remainingUses',
    CUSTOM_API_KEY: 'customApiKey'
};

let remainingUses = parseInt(localStorage.getItem(STORAGE_KEYS.REMAINING_USES) || MAX_FREE_USES);
updateRemainingUses();

function updateRemainingUses() {
    document.getElementById('remainingUses').textContent = remainingUses;
    localStorage.setItem(STORAGE_KEYS.REMAINING_USES, remainingUses);
    
    // 如果次数用完，显示API密钥输入界面
    if (remainingUses <= 0) {
        document.getElementById('apiKeySection').style.display = 'block';
        document.getElementById('dropZone').style.display = 'none';
    }
}

document.getElementById('saveApiKey').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (apiKey) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_API_KEY, apiKey);
        document.getElementById('apiKeySection').style.display = 'none';
        document.getElementById('dropZone').style.display = 'block';
        alert('API密钥已保存！');
    } else {
        alert('请输入有效的API密钥');
    }
});

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
        handleFile(files[0]);
    });

    // 处理文件选择
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });

    // 处理文件
    function handleFile(file) {
        if (!file.type.match('image.*')) {
            alert('请选择图片文件！');
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Image = e.target.result;
            document.getElementById('imagePreview').src = base64Image;
            document.getElementById('previewSection').style.display = 'block';
            
            // 存储base64图片数据
            currentImageData = base64Image;
        };
        reader.readAsDataURL(file);
    }

    // 分析按钮点击事件
    document.getElementById('analyzeBtn').addEventListener('click', async function() {
        if (!currentImageData) {
            alert('请先选择一张图片！');
            return;
        }

        try {
            showLoading();
            const result = await analyzeFood(currentImageData);
            displayResult(result);
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || '分析失败，请重试');
        } finally {
            hideLoading();
        }
    });

    // 显示结果
    function displayResult(result) {
        document.getElementById('foodName').textContent = result.foodName;
        document.getElementById('calories').textContent = result.calories;
        document.getElementById('nutritionAdvice').textContent = result.advice;
        resultSection.style.display = 'block';
    }

    // 加载动画
    function showLoading() {
        loading.style.display = 'block';
        analyzeBtn.disabled = true;
    }

    // 隐藏加载动画
    function hideLoading() {
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
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
async function analyzeFood(base64Image) {
    try {
        // 检查是否有自定义API密钥
        const customApiKey = localStorage.getItem(STORAGE_KEYS.CUSTOM_API_KEY);
        const apiKey = customApiKey || (config && config.GOOGLE_API_KEY);
        
        if (!apiKey) {
            throw new Error('未找到有效的API密钥，请在设置中配置');
        }

        // 如果使用默认密钥且次数用完，显示提示
        if (!customApiKey && remainingUses <= 0) {
            throw new Error('免费使用次数已用完，请输入您的API密钥');
        }

        // 如果使用默认密钥，减少剩余次数
        if (!customApiKey) {
            remainingUses--;
            updateRemainingUses();
        }

        // 移除base64编码的前缀
        const imageContent = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

        const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requests: [{
                    image: {
                        content: imageContent
                    },
                    features: [{
                        type: 'LABEL_DETECTION',
                        maxResults: 10
                    }]
                }]
            })
        });

        if (!visionResponse.ok) {
            const errorData = await visionResponse.text();
            console.error('Vision API错误响应:', errorData);
            if (customApiKey) {
                localStorage.removeItem(STORAGE_KEYS.CUSTOM_API_KEY);
                alert('API密钥无效，请重新输入');
                document.getElementById('apiKeySection').style.display = 'block';
            }
            throw new Error(`分析失败: ${visionResponse.status}`);
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

let currentImageData = null;
