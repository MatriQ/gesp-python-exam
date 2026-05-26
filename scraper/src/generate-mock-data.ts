import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { ExamLevel, QuestionType } from '../../shared/src/types.js';
import { SESSIONS, LEVEL_TOPICS } from '../../shared/src/constants.js';
import type { ExtractedOption } from './llm-extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

const SESSIONS_LIST = [...SESSIONS];
const LEVELS: ExamLevel[] = [1, 2, 3, 4, 5, 6, 7, 8];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickRandomN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const MC_TEMPLATES: Record<number, Array<{ stem: string; options: [string, string, string, string]; answer: 'A' | 'B' | 'C' | 'D' }>> = {
  1: [
    { stem: '在Python中，以下哪个是合法的变量名？', options: ['2name', '_name', 'name!', 'class'], answer: 'B' },
    { stem: 'Python中 print(type(3.14)) 的输出结果是？', options: ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'bool'>"], answer: 'B' },
    { stem: '以下哪个运算符用于整除？', options: ['/', '//', '%', '**'], answer: 'B' },
    { stem: 'Python中 input() 函数的返回值类型是？', options: ['int', 'float', 'str', 'bool'], answer: 'C' },
    { stem: '以下哪个是Python的注释符号？', options: ['//', '/*', '#', '--'], answer: 'C' },
    { stem: '表达式 2 ** 3 的值是？', options: ['6', '8', '5', '9'], answer: 'B' },
    { stem: '以下哪个语句可以正确导入math模块？', options: ['import math', 'include math', 'using math', 'require math'], answer: 'A' },
    { stem: '在Python中，以下哪个关键字用于定义函数？', options: ['function', 'def', 'func', 'define'], answer: 'B' },
    { stem: '表达式 len("Hello") 的值是？', options: ['4', '5', '6', '"Hello"'], answer: 'B' },
    { stem: '以下哪种数据类型是不可变的？', options: ['list', 'dict', 'tuple', 'set'], answer: 'C' },
    { stem: 'Python中布尔值 True 的整数值是？', options: ['0', '1', '-1', '2'], answer: 'B' },
    { stem: '表达式 "ab" + "cd" 的结果是？', options: ['"abcd"', '"ab cd"', '"ab+cd"', '报错'], answer: 'A' },
    { stem: '以下哪个是Python的保留关键字？', options: ['hello', 'for', 'name', 'value'], answer: 'B' },
    { stem: 'Turtle绘图中，forward(100) 的作用是？', options: ['后退100像素', '前进100像素', '左转100度', '右转100度'], answer: 'B' },
    { stem: '表达式 10 % 3 的值是？', options: ['3', '3.33', '1', '0'], answer: 'C' },
  ],
  2: [
    { stem: 'ASCII编码中，字符"A"的十进制值是多少？', options: ['65', '66', '97', '48'], answer: 'A' },
    { stem: '以下哪个是将字符串转换为整数的函数？', options: ['str()', 'int()', 'float()', 'bool()'], answer: 'B' },
    { stem: '在流程图中，菱形表示什么？', options: ['开始/结束', '处理', '判断', '输入/输出'], answer: 'C' },
    { stem: '表达式 int("123") + 1 的值是？', options: ['"1231"', '124', '"124"', '报错'], answer: 'B' },
    { stem: '计算机中1KB等于多少字节？', options: ['1000', '1024', '512', '100'], answer: 'B' },
    { stem: '以下哪种网络协议用于网页浏览？', options: ['FTP', 'HTTP', 'SMTP', 'TCP'], answer: 'B' },
    { stem: 'Python中 elif 是什么的缩写？', options: ['else if', 'else in', 'element if', 'empty if'], answer: 'A' },
    { stem: '多层循环中，break 语句的作用范围是？', options: ['跳出所有循环', '跳出当前循环', '跳出程序', '继续循环'], answer: 'B' },
    { stem: '表达式 round(3.14159, 2) 的值是？', options: ['3.14', '3.15', '3.1', '3'], answer: 'A' },
    { stem: '以下哪种是程序设计语言？', options: ['Word', 'Python', 'Photoshop', 'Excel'], answer: 'B' },
    { stem: '表达式 abs(-5) 的值是？', options: ['-5', '5', '0', '报错'], answer: 'B' },
    { stem: '二进制数 1010 转换为十进制是？', options: ['8', '10', '12', '5'], answer: 'B' },
    { stem: 'Python中 math.sqrt(16) 的值是？', options: ['4.0', '4', '16', '报错'], answer: 'A' },
    { stem: '以下哪个不是Python的比较运算符？', options: ['==', '!=', '<>', '>='], answer: 'C' },
    { stem: 'continue 语句的作用是？', options: ['结束循环', '跳过本次迭代', '结束程序', '重新开始循环'], answer: 'B' },
  ],
  3: [
    { stem: '十六进制数 FF 转换为十进制是？', options: ['255', '256', '15', '100'], answer: 'A' },
    { stem: '表达式 0b1010 & 0b1100 的结果是？', options: ['0b1000', '0b1110', '0b1010', '0b1100'], answer: 'A' },
    { stem: '以下哪个方法可以向列表末尾添加元素？', options: ['add()', 'append()', 'insert()', 'push()'], answer: 'B' },
    { stem: '表达式 [1,2,3] + [4,5] 的结果是？', options: ['[5,7,3]', '[1,2,3,4,5]', '[1,2,3][4,5]', '报错'], answer: 'B' },
    { stem: '字典中获取所有键的方法是？', options: ['.values()', '.keys()', '.items()', '.all()'], answer: 'B' },
    { stem: '表达式 {1,2,3} & {2,3,4} 的结果是？', options: ['{1,2,3,4}', '{2,3}', '{1}', '{4}'], answer: 'B' },
    { stem: '列表解析 [x**2 for x in range(5)] 的结果是？', options: ['[0,1,4,9,16]', '[1,4,9,16,25]', '[0,1,2,3,4]', '[0,2,4,6,8]'], answer: 'A' },
    { stem: '表达式 "hello".upper() 的结果是？', options: ['"HELLO"', '"hello"', '"Hello"', '报错'], answer: 'A' },
    { stem: '元组与列表的主要区别是？', options: ['长度不同', '元组不可变', '列表不可变', '没有区别'], answer: 'B' },
    { stem: '表达式 bin(10) 的结果是？', options: ["'0b1010'", "'1010'", "'0b10'", "10"], answer: 'A' },
    { stem: '以下哪个不是Python的内置数据结构？', options: ['list', 'dict', 'array', 'set'], answer: 'C' },
    { stem: '表达式 list(range(1,10,2)) 的结果是？', options: ['[1,3,5,7,9]', '[1,2,3,4,5]', '[2,4,6,8]', '[1,3,5,7]'], answer: 'A' },
    { stem: '字符串方法 .find("x") 找不到子串时返回？', options: ['0', '-1', 'None', '报错'], answer: 'B' },
    { stem: '枚举法的核心思想是？', options: ['递归求解', '逐一尝试所有可能', '分而治之', '贪心选择'], answer: 'B' },
    { stem: '表达式 5 >> 1 的值是？', options: ['2', '3', '10', '1'], answer: 'A' },
  ],
  4: [
    { stem: 'Python中，函数参数的默认值是在什么时候计算的？', options: ['函数调用时', '函数定义时', '运行时动态计算', '编译时'], answer: 'B' },
    { stem: '以下关于变量作用域的说法正确的是？', options: ['局部变量可以在函数外访问', 'global关键字用于声明局部变量', '函数内可直接修改全局变量', 'LEGB规则决定了名称查找顺序'], answer: 'D' },
    { stem: '冒泡排序的时间复杂度是？', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'], answer: 'C' },
    { stem: '以下哪种异常处理结构是正确的？', options: ['try...catch', 'try...except', 'try...handle', 'try...error'], answer: 'B' },
    { stem: '递推算法与递归算法的主要区别是？', options: ['递推自底向上，递归自顶向下', '递推更快', '递归更简单', '没有区别'], answer: 'A' },
    { stem: '以下哪种排序算法是稳定的？', options: ['选择排序', '快速排序', '冒泡排序', '堆排序'], answer: 'C' },
    { stem: 'Python中 with open("f.txt") as f: 的作用是？', options: ['只读打开', '自动关闭文件', '写入文件', '删除文件'], answer: 'B' },
    { stem: '函数定义中 *args 的作用是？', options: ['接收关键字参数', '接收任意数量位置参数', '接收字典参数', '设置默认参数'], answer: 'B' },
    { stem: '以下哪个是O(n log n)的排序算法？', options: ['冒泡排序', '插入排序', '归并排序', '选择排序'], answer: 'C' },
    { stem: '列表的sort()方法返回什么？', options: ['排序后的新列表', 'None', '原列表', 'True'], answer: 'B' },
    { stem: '复合类型嵌套是指？', options: ['函数嵌套调用', '数据结构中包含数据结构', '循环嵌套', '条件嵌套'], answer: 'B' },
    { stem: 'Python中 raise 语句的作用是？', options: ['捕获异常', '抛出异常', '处理异常', '忽略异常'], answer: 'B' },
    { stem: '插入排序的最优时间复杂度是？', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'], answer: 'A' },
    { stem: '以下关于Python文件操作，错误的是？', options: ['"r"模式只读', '"w"模式会覆盖', '"a"模式追加', '"r"模式可写'], answer: 'D' },
    { stem: '以下哪个不是算法复杂度的表示法？', options: ['O(n)', 'Ω(n)', 'Θ(n)', 'T(n)'], answer: 'D' },
  ],
  5: [
    { stem: '素数的定义是？', options: ['能被2整除的数', '只能被1和自身整除的大于1的整数', '所有奇数', '小于100的数'], answer: 'B' },
    { stem: '欧几里得算法用于计算？', options: ['素数', '最大公约数', '最小公倍数', '阶乘'], answer: 'B' },
    { stem: '埃氏筛法的时间复杂度是？', options: ['O(n)', 'O(n log log n)', 'O(n²)', 'O(n log n)'], answer: 'B' },
    { stem: '二分查找的前提条件是？', options: ['数组是无序的', '数组是有序的', '数组长度为偶数', '数组元素唯一'], answer: 'B' },
    { stem: '链表相比数组的优势是？', options: ['随机访问更快', '插入删除更高效', '占用空间更少', '排序更快'], answer: 'B' },
    { stem: '贪心算法的核心思想是？', options: ['尝试所有方案', '每步选择局部最优', '自顶向下分解', '记忆化搜索'], answer: 'B' },
    { stem: '归并排序使用了什么算法策略？', options: ['贪心', '动态规划', '分治', '回溯'], answer: 'C' },
    { stem: '唯一分解定理说明每个大于1的整数可以？', options: ['表示为素数的乘积', '表示为连续数的和', '表示为平方和', '表示为差'], answer: 'A' },
    { stem: '二分答案适用于什么类型的问题？', options: ['最短路径', '求满足条件的最大/最小值', '排序', '图的遍历'], answer: 'B' },
    { stem: '递归的三要素不包括？', options: ['边界条件', '递推关系', '循环变量', '返回值'], answer: 'C' },
    { stem: '快速排序的平均时间复杂度是？', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], answer: 'B' },
    { stem: '线性筛法相比埃氏筛法的优势是？', options: ['更简单', '每个合数只被筛一次', '空间更少', '不需要数组'], answer: 'B' },
    { stem: '分治算法的步骤不包括？', options: ['分解', '解决', '合并', '枚举'], answer: 'D' },
    { stem: 'gcd(12, 8) 的值是？', options: ['2', '4', '6', '8'], answer: 'B' },
    { stem: '以下哪个是背包问题的特征？', options: ['求最短路径', '在容量限制下选物品使价值最大', '排序', '查找'], answer: 'B' },
  ],
  6: [
    { stem: '完全二叉树的第k层最多有多少个节点？', options: ['k', '2k', '2^(k-1)', '2^k'], answer: 'C' },
    { stem: 'DFS使用什么数据结构实现？', options: ['队列', '栈', '堆', '链表'], answer: 'B' },
    { stem: '动态规划与分治的主要区别是？', options: ['动态规划更快', '动态规划有重叠子问题', '分治更简单', '没有区别'], answer: 'B' },
    { stem: '面向对象的三大特征是？', options: ['输入、处理、输出', '封装、继承、多态', '定义、调用、返回', '创建、使用、销毁'], answer: 'B' },
    { stem: 'BFS使用什么数据结构实现？', options: ['栈', '队列', '堆', '链表'], answer: 'B' },
    { stem: '哈夫曼树的特点是？', options: ['完全平衡', '带权路径长度最短', '每个节点有两个子节点', '深度最小'], answer: 'B' },
    { stem: 'Python中 __init__ 方法的作用是？', options: ['销毁对象', '初始化对象', '调用方法', '创建类'], answer: 'B' },
    { stem: '一维DP中状态转移方程描述的是？', options: ['初始状态', '状态之间的关系', '边界条件', '最终结果'], answer: 'B' },
    { stem: '二叉排序树的中序遍历结果是？', options: ['无序的', '递增有序的', '递减有序的', '随机的'], answer: 'B' },
    { stem: '栈的特点是？', options: ['先进先出', '先进后出', '随机访问', '双端操作'], answer: 'B' },
    { stem: '循环队列解决了什么问题？', options: ['排序问题', '假溢出问题', '查找问题', '递归问题'], answer: 'B' },
    { stem: 'Python中 super() 函数的作用是？', options: ['创建对象', '调用父类方法', '销毁对象', '定义类'], answer: 'B' },
    { stem: '背包问题中，01背包与完全背包的区别是？', options: ['物品重量不同', '物品能否重复选取', '背包容量不同', '物品价值不同'], answer: 'B' },
    { stem: '哈夫曼编码是哪种编码？', options: ['等长编码', '前缀编码', '后缀编码', '固定编码'], answer: 'B' },
    { stem: '多态是指？', options: ['一个类继承多个类', '同一接口不同实现', '方法重载', '变量多次赋值'], answer: 'B' },
  ],
  7: [
    { stem: 'LIS问题的中文含义是？', options: ['最长公共子序列', '最长递增子序列', '最短路径', '最大流'], answer: 'B' },
    { stem: '滚动数组的作用是？', options: ['加速计算', '减少空间复杂度', '简化代码', '提高精度'], answer: 'B' },
    { stem: '图的邻接矩阵表示法的空间复杂度是？', options: ['O(n)', 'O(n²)', 'O(n+m)', 'O(log n)'], answer: 'B' },
    { stem: '区间DP的状态通常定义为？', options: ['dp[i]', 'dp[i][j]表示区间[i,j]', 'dp[i][j]表示前i个选j个', 'dp[i][k]'], answer: 'B' },
    { stem: '哈希表的平均查找时间复杂度是？', options: ['O(n)', 'O(1)', 'O(log n)', 'O(n log n)'], answer: 'B' },
    { stem: 'LCS问题使用什么算法策略？', options: ['贪心', '动态规划', '分治', '回溯'], answer: 'B' },
    { stem: '泛洪算法（Flood Fill）通常使用什么实现？', options: ['动态规划', 'BFS/DFS', '贪心', '分治'], answer: 'B' },
    { stem: 'Python中 math.log(100) 默认的底数是？', options: ['2', '10', 'e', '100'], answer: 'C' },
    { stem: '二维DP中状态dp[i][j]通常表示？', options: ['第i个元素的值', '前i个物品/行，第j个状态的结果', '坐标(i,j)的值', '矩阵元素'], answer: 'B' },
    { stem: '图的遍历方式不包括？', options: ['DFS', 'BFS', '二分查找', '拓扑排序'], answer: 'C' },
    { stem: '哈希冲突的常见解决方法不包括？', options: ['链地址法', '开放地址法', '再哈希', '排序法'], answer: 'D' },
    { stem: '三角函数 math.sin() 的参数单位是？', options: ['角度', '弧度', '梯度', '无单位'], answer: 'B' },
    { stem: '指数函数 math.exp(1) 的值约等于？', options: ['1', '2.718', '3.14', '10'], answer: 'B' },
    { stem: 'Dijkstra算法不能处理什么类型的图？', options: ['有向图', '无向图', '负权边图', '稀疏图'], answer: 'C' },
    { stem: 'DP空间优化的核心思想是？', options: ['增加维度', '复用不再需要的状态空间', '改变问题', '使用递归'], answer: 'B' },
  ],
  8: [
    { stem: '组合数 C(n,k) 的计算公式是？', options: ['n!/k!', 'n!/(k!(n-k)!)', 'n^k', 'n*(n-1)*...*(n-k+1)'], answer: 'B' },
    { stem: 'Kruskal算法使用了什么数据结构？', options: ['优先队列', '并查集', '线段树', '树状数组'], answer: 'B' },
    { stem: '杨辉三角中第n行第k个数的值等于？', options: ['C(n,k)', 'C(n-1,k-1)+C(n-1,k)', 'n*k', '2^n'], answer: 'B' },
    { stem: 'Dijkstra算法的时间复杂度（使用优先队列）是？', options: ['O(V²)', 'O(V log V + E log V)', 'O(E)', 'O(V+E)'], answer: 'B' },
    { stem: '倍增法（Binary Lifting）的核心思想是？', options: ['递归', '预处理2的幂次信息', '贪心', '暴力枚举'], answer: 'B' },
    { stem: 'Floyd算法的时间复杂度是？', options: ['O(V²)', 'O(V³)', 'O(VE)', 'O(V log V)'], answer: 'B' },
    { stem: '排列数 P(n,k) 等于？', options: ['n!/k!', 'n!/(n-k)!', 'C(n,k)*k!', 'n^k'], answer: 'C' },
    { stem: 'Prim算法从一个顶点出发，每次选择？', options: ['最短边', '连接已选集和未选集的最短边', '最大权值边', '随机边'], answer: 'B' },
    { stem: '最小生成树的边数是？', options: ['V', 'V-1', 'V+1', 'E'], answer: 'B' },
    { stem: '平面几何中，三角形面积公式（海伦公式）需要知道？', options: ['两边', '三边', '一边一角', '两角'], answer: 'B' },
    { stem: '算法优化的主要目标不包括？', options: ['减少时间复杂度', '减少空间复杂度', '增加代码行数', '优化常数因子'], answer: 'C' },
    { stem: '计数原理中的乘法原理适用于？', options: ['互不相关的事件', '互斥事件', '独立事件', '所有事件'], answer: 'C' },
    { stem: '最短路径问题中，Bellman-Ford能处理？', options: ['只有正权', '正权和负权', '只有负权', '无权图'], answer: 'B' },
    { stem: '复杂度分析中，O(1)表示？', options: ['常数时间', '线性时间', '对数时间', '无时间'], answer: 'A' },
    { stem: '倍增法预处理的时间复杂度是？', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], answer: 'B' },
  ],
};

const TF_TEMPLATES: Record<number, Array<{ stem: string; answer: boolean }>> = {
  1: [
    { stem: 'Python是一种解释型语言。', answer: true },
    { stem: '在Python中，缩进是语法的一部分。', answer: true },
    { stem: 'print语句可以同时输出多个值。', answer: true },
    { stem: 'Python中变量必须先声明类型再使用。', answer: false },
    { stem: '整数和浮点数相加，结果是浮点数。', answer: true },
    { stem: 'Python中单引号和双引号不能混用。', answer: false },
    { stem: 'for循环只能用于遍历列表。', answer: false },
    { stem: 'while循环可能一次都不执行。', answer: true },
    { stem: 'Python中变量名区分大小写。', answer: true },
    { stem: '在Turtle绘图中，penup()表示开始画线。', answer: false },
  ],
  2: [
    { stem: '计算机存储的最小单位是字节(Byte)。', answer: false },
    { stem: 'HTTP协议默认使用80端口。', answer: true },
    { stem: 'Python中，float类型可以精确表示所有小数。', answer: false },
    { stem: '多层if-elif-else结构中，最多只会执行一个分支。', answer: true },
    { stem: 'break语句只能用于for循环，不能用于while循环。', answer: false },
    { stem: '流程图中，箭头表示程序的执行方向。', answer: true },
    { stem: '二进制是计算机内部使用的数制。', answer: true },
    { stem: 'Python中，嵌套循环的总次数等于各层循环次数之和。', answer: false },
    { stem: 'str()函数可以将任何类型转换为字符串。', answer: true },
    { stem: 'ASCII编码可以表示所有中文字符。', answer: false },
  ],
  3: [
    { stem: '列表中的元素可以是不同类型。', answer: true },
    { stem: '字典中的键可以重复。', answer: false },
    { stem: '集合(set)中的元素是有序的。', answer: false },
    { stem: '列表推导式比普通for循环执行效率更高。', answer: true },
    { stem: '元组创建后可以修改其中的元素。', answer: false },
    { stem: '字符串是不可变类型，不能原地修改。', answer: true },
    { stem: '八进制数在Python中用前缀0o表示。', answer: true },
    { stem: '两个集合的差集 A-B 等价于 B-A。', answer: false },
    { stem: '位运算中的左移一位相当于乘以2。', answer: true },
    { stem: 'Python中列表的索引从1开始。', answer: false },
  ],
  4: [
    { stem: 'Python函数可以返回多个值。', answer: true },
    { stem: '局部变量的生命周期是整个程序运行期间。', answer: false },
    { stem: '异常处理中，finally块总是会执行。', answer: true },
    { stem: '所有排序算法的最坏时间复杂度都是O(n²)。', answer: false },
    { stem: 'Python中，函数可以作为参数传递给另一个函数。', answer: true },
    { stem: '选择排序是一种稳定排序。', answer: false },
    { stem: '递推和递归是同一种算法。', answer: false },
    { stem: 'Python中打开文件后必须手动关闭。', answer: false },
    { stem: '形参和实参必须同名。', answer: false },
    { stem: '算法复杂度分析只考虑最坏情况。', answer: false },
  ],
  5: [
    { stem: '1不是素数。', answer: true },
    { stem: '2是唯一的偶素数。', answer: true },
    { stem: '二分查找的前提是数据有序。', answer: true },
    { stem: '链表支持随机访问。', answer: false },
    { stem: '贪心算法一定能得到全局最优解。', answer: false },
    { stem: '归并排序是稳定排序。', answer: true },
    { stem: '快速排序的最坏时间复杂度是O(n²)。', answer: true },
    { stem: '递归算法必须有递归终止条件。', answer: true },
    { stem: '二分答案和二分查找是同一个算法。', answer: false },
    { stem: '埃氏筛法可以用于求区间内的素数个数。', answer: true },
  ],
  6: [
    { stem: '二叉树的前序遍历顺序是根-左-右。', answer: true },
    { stem: 'BFS通常使用栈来实现。', answer: false },
    { stem: '动态规划的两个核心要素是最优子结构和重叠子问题。', answer: true },
    { stem: 'Python中的类可以有多个父类。', answer: true },
    { stem: '哈夫曼树中，频率越高的字符离根越远。', answer: false },
    { stem: '01背包问题可以使用贪心算法解决。', answer: false },
    { stem: '栈是后进先出(LIFO)的数据结构。', answer: true },
    { stem: '封装是指隐藏对象的属性和实现细节。', answer: true },
    { stem: '完全二叉树一定是满二叉树。', answer: false },
    { stem: '队列中，元素从队尾入队，从队首出队。', answer: true },
  ],
  7: [
    { stem: 'LIS问题可以用动态规划求解。', answer: true },
    { stem: '哈希表查找的最坏时间复杂度是O(1)。', answer: false },
    { stem: '图的邻接表表示适合存储稀疏图。', answer: true },
    { stem: '区间DP的状态转移通常涉及区间端点。', answer: true },
    { stem: '对数函数 log₂(8) 等于3。', answer: true },
    { stem: '滚动数组优化不改变时间复杂度。', answer: true },
    { stem: 'Dijkstra算法可以处理负权边。', answer: false },
    { stem: 'LCS问题中子序列要求连续。', answer: false },
    { stem: '泛洪算法可以用来计算连通分量。', answer: true },
    { stem: '二维DP的状态定义一定比一维DP更优。', answer: false },
  ],
  8: [
    { stem: '排列和组合的区别在于是否考虑顺序。', answer: true },
    { stem: 'C(n,0) = 0。', answer: false },
    { stem: 'Kruskal算法基于贪心策略。', answer: true },
    { stem: 'Floyd算法可以处理负权边。', answer: true },
    { stem: '最小生成树一定唯一。', answer: false },
    { stem: '杨辉三角中每行的和等于2的幂。', answer: true },
    { stem: '倍增法的预处理空间复杂度是O(n log n)。', answer: true },
    { stem: 'Dijkstra算法使用了动态规划思想。', answer: false },
    { stem: 'P(n,n) = n!。', answer: true },
    { stem: 'Prim算法适合稠密图。', answer: true },
  ],
};

const PROGRAMMING_TEMPLATES: Record<number, Array<{
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInputs: string[];
  sampleOutputs: string[];
  referenceSolution: string;
}>> = {
  1: [
    {
      title: '温度转换',
      description: '输入一个华氏温度，输出对应的摄氏温度。转换公式：C = (F - 32) * 5 / 9，结果保留两位小数。',
      inputFormat: '一个浮点数F，表示华氏温度',
      outputFormat: '一个浮点数，表示摄氏温度，保留两位小数',
      constraints: '-100 ≤ F ≤ 200',
      sampleInputs: ['100'],
      sampleOutputs: ['37.78'],
      referenceSolution: `f = float(input())
c = (f - 32) * 5 / 9
print(f"{c:.2f}")`,
    },
    {
      title: '奇偶判断',
      description: '输入一个整数，判断它是奇数还是偶数。如果是偶数输出"even"，否则输出"odd"。',
      inputFormat: '一个整数n',
      outputFormat: '字符串"even"或"odd"',
      constraints: '-1000 ≤ n ≤ 1000',
      sampleInputs: ['7'],
      sampleOutputs: ['odd'],
      referenceSolution: `n = int(input())
if n % 2 == 0:
    print("even")
else:
    print("odd")`,
    },
  ],
  2: [
    {
      title: '数字统计',
      description: '输入一个正整数n，输出1到n之间所有能被3整除但不能被5整除的数的个数。',
      inputFormat: '一个正整数n',
      outputFormat: '一个整数，表示满足条件的数的个数',
      constraints: '1 ≤ n ≤ 10000',
      sampleInputs: ['20'],
      sampleOutputs: ['5'],
      referenceSolution: `n = int(input())
count = 0
for i in range(1, n + 1):
    if i % 3 == 0 and i % 5 != 0:
        count += 1
print(count)`,
    },
    {
      title: '字符统计',
      description: '输入一个字符串，分别统计其中大写字母、小写字母和数字的个数。',
      inputFormat: '一个字符串s',
      outputFormat: '三个整数，分别表示大写字母、小写字母和数字的个数，用空格分隔',
      constraints: '字符串长度不超过1000',
      sampleInputs: ['Hello123World'],
      sampleOutputs: ['2 8 3'],
      referenceSolution: `s = input()
upper = lower = digit = 0
for c in s:
    if c.isupper():
        upper += 1
    elif c.islower():
        lower += 1
    elif c.isdigit():
        digit += 1
print(upper, lower, digit)`,
    },
  ],
  3: [
    {
      title: '列表操作',
      description: '输入n个整数存入列表，然后进行以下操作：1. 去除重复元素 2. 排序 3. 输出处理后的列表。',
      inputFormat: '第一行一个整数n，第二行n个整数，用空格分隔',
      outputFormat: '去重排序后的列表',
      constraints: '1 ≤ n ≤ 1000，-10000 ≤ 每个整数 ≤ 10000',
      sampleInputs: ['8', '3 1 4 1 5 9 2 6'],
      sampleOutputs: ['[1, 2, 3, 4, 5, 6, 9]'],
      referenceSolution: `n = int(input())
nums = list(map(int, input().split()))
result = sorted(set(nums))
print(result)`,
    },
    {
      title: '进制转换',
      description: '输入一个十进制正整数n，输出它的二进制、八进制和十六进制表示。',
      inputFormat: '一个正整数n',
      outputFormat: '三行，分别是二进制、八进制和十六进制表示（不含前缀）',
      constraints: '1 ≤ n ≤ 100000',
      sampleInputs: ['255'],
      sampleOutputs: ['11111111', '377', 'ff'],
      referenceSolution: `n = int(input())
print(bin(n)[2:])
print(oct(n)[2:])
print(hex(n)[2:])`,
    },
  ],
  4: [
    {
      title: '冒泡排序改进',
      description: '实现冒泡排序，并统计实际交换次数。如果某一轮没有发生交换，提前结束。',
      inputFormat: '第一行一个整数n，第二行n个整数',
      outputFormat: '排序后的数组（空格分隔）和交换次数，各占一行',
      constraints: '1 ≤ n ≤ 1000',
      sampleInputs: ['5', '5 3 1 4 2'],
      sampleOutputs: ['1 2 3 4 5', '6'],
      referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
swaps = 0
for i in range(n - 1):
    swapped = False
    for j in range(n - 1 - i):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]
            swaps += 1
            swapped = True
    if not swapped:
        break
print(' '.join(map(str, arr)))
print(swaps)`,
    },
    {
      title: '文件词频统计',
      description: '给定一个字符串，统计每个单词出现的次数，按出现次数从大到小输出。次数相同的按字典序输出。',
      inputFormat: '一行字符串，包含若干个英文单词，用空格分隔',
      outputFormat: '每行一个单词及其出现次数，用空格分隔',
      constraints: '字符串长度不超过10000',
      sampleInputs: ['hello world hello python world world'],
      sampleOutputs: ['world 3', 'hello 2', 'python 1'],
      referenceSolution: `words = input().split()
freq = {}
for w in words:
    freq[w] = freq.get(w, 0) + 1
result = sorted(freq.items(), key=lambda x: (-x[1], x[0]))
for word, count in result:
    print(word, count)`,
    },
  ],
  5: [
    {
      title: '素数区间',
      description: '给定区间[L, R]，求该区间内素数的个数。',
      inputFormat: '两个正整数L和R，用空格分隔',
      outputFormat: '一个整数，表示区间内素数的个数',
      constraints: '2 ≤ L ≤ R ≤ 1000000',
      sampleInputs: ['1 10'],
      sampleOutputs: ['4'],
      referenceSolution: `import math
l, r = map(int, input().split())
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0:
            return False
    return True
count = sum(1 for i in range(l, r + 1) if is_prime(i))
print(count)`,
    },
    {
      title: '二分查找位置',
      description: '在一个有序数组中查找目标值，如果找到返回其索引，否则返回-1。',
      inputFormat: '第一行n个有序整数，第二行目标值',
      outputFormat: '目标值的索引（从0开始），或-1',
      constraints: '1 ≤ n ≤ 100000',
      sampleInputs: ['1 3 5 7 9 11', '7'],
      sampleOutputs: ['3'],
      referenceSolution: `arr = list(map(int, input().split()))
target = int(input())
left, right = 0, len(arr) - 1
result = -1
while left <= right:
    mid = (left + right) // 2
    if arr[mid] == target:
        result = mid
        break
    elif arr[mid] < target:
        left = mid + 1
    else:
        right = mid - 1
print(result)`,
    },
  ],
  6: [
    {
      title: '二叉树遍历',
      description: '给定二叉树的层序遍历序列（空节点用-1表示），输出其前序遍历结果。',
      inputFormat: '第一行n个整数，表示层序遍历序列',
      outputFormat: '前序遍历结果，空格分隔',
      constraints: '1 ≤ n ≤ 1000',
      sampleInputs: ['1 2 3 4 5 -1 7'],
      sampleOutputs: ['1 2 4 5 3 7'],
      referenceSolution: `arr = list(map(int, input().split()))
def preorder(i):
    if i >= len(arr) or arr[i] == -1:
        return []
    return [arr[i]] + preorder(2*i+1) + preorder(2*i+2)
result = preorder(0)
print(' '.join(map(str, result)))`,
    },
    {
      title: '01背包问题',
      description: '有n个物品和一个容量为W的背包，每个物品有重量和价值，求最大价值。',
      inputFormat: '第一行n和W，接下来n行每行两个整数w和v',
      outputFormat: '一个整数，表示最大价值',
      constraints: '1 ≤ n ≤ 100, 1 ≤ W ≤ 1000',
      sampleInputs: ['4 5', '1 2', '2 4', '3 4', '4 5'],
      sampleOutputs: ['8'],
      referenceSolution: `n, W = map(int, input().split())
items = [tuple(map(int, input().split())) for _ in range(n)]
dp = [0] * (W + 1)
for w, v in items:
    for j in range(W, w - 1, -1):
        dp[j] = max(dp[j], dp[j-w] + v)
print(dp[W])`,
    },
  ],
  7: [
    {
      title: '最长递增子序列',
      description: '给定一个整数序列，求最长严格递增子序列的长度。',
      inputFormat: '第一行n，第二行n个整数',
      outputFormat: '一个整数，LIS的长度',
      constraints: '1 ≤ n ≤ 10000',
      sampleInputs: ['6', '10 9 2 5 3 7'],
      sampleOutputs: ['3'],
      referenceSolution: `import bisect
n = int(input())
nums = list(map(int, input().split()))
tails = []
for x in nums:
    pos = bisect.bisect_left(tails, x)
    if pos == len(tails):
        tails.append(x)
    else:
        tails[pos] = x
print(len(tails))`,
    },
    {
      title: '图的BFS遍历',
      description: '给定一个无向图的邻接表表示，从节点1开始BFS遍历，输出遍历顺序。',
      inputFormat: '第一行n和m，接下来m行每行两个整数u和v表示边',
      outputFormat: 'BFS遍历顺序，空格分隔',
      constraints: '1 ≤ n ≤ 1000, 0 ≤ m ≤ 10000',
      sampleInputs: ['5 4', '1 2', '1 3', '2 4', '3 5'],
      sampleOutputs: ['1 2 3 4 5'],
      referenceSolution: `from collections import deque
n, m = map(int, input().split())
adj = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v = map(int, input().split())
    adj[u].append(v)
    adj[v].append(u)
for a in adj:
    a.sort()
visited = [False] * (n + 1)
q = deque([1])
visited[1] = True
result = []
while q:
    u = q.popleft()
    result.append(u)
    for v in adj[u]:
        if not visited[v]:
            visited[v] = True
            q.append(v)
print(' '.join(map(str, result)))`,
    },
  ],
  8: [
    {
      title: '最短路径',
      description: '给定一个有向加权图，求从节点1到所有其他节点的最短路径。',
      inputFormat: '第一行n和m，接下来m行每行u,v,w表示边',
      outputFormat: 'n-1个整数，表示1到2,3,...,n的最短距离，不可达输出-1',
      constraints: '1 ≤ n ≤ 1000, 1 ≤ m ≤ 10000, 1 ≤ w ≤ 10000',
      sampleInputs: ['4 4', '1 2 1', '1 3 4', '2 3 2', '3 4 1'],
      sampleOutputs: ['1 3 4'],
      referenceSolution: `import heapq
n, m = map(int, input().split())
adj = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v, w = map(int, input().split())
    adj[u].append((v, w))
dist = [float('inf')] * (n + 1)
dist[1] = 0
pq = [(0, 1)]
while pq:
    d, u = heapq.heappop(pq)
    if d > dist[u]:
        continue
    for v, w in adj[u]:
        if dist[u] + w < dist[v]:
            dist[v] = dist[u] + w
            heapq.heappush(pq, (dist[v], v))
result = []
for i in range(2, n + 1):
    result.append(str(dist[i] if dist[i] != float('inf') else -1))
print(' '.join(result))`,
    },
    {
      title: '最小生成树',
      description: '给定一个无向加权图，求其最小生成树的总权重。',
      inputFormat: '第一行n和m，接下来m行每行u,v,w表示边',
      outputFormat: '一个整数，最小生成树的总权重',
      constraints: '2 ≤ n ≤ 1000, 1 ≤ m ≤ 10000',
      sampleInputs: ['4 5', '1 2 1', '1 3 2', '2 3 3', '2 4 4', '3 4 5'],
      sampleOutputs: ['7'],
      referenceSolution: `n, m = map(int, input().split())
edges = []
for _ in range(m):
    u, v, w = map(int, input().split())
    edges.append((w, u, v))
edges.sort()
parent = list(range(n + 1))
def find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])
    return parent[x]
def union(a, b):
    a, b = find(a), find(b)
    if a != b:
        parent[a] = b
        return True
    return False
total = 0
for w, u, v in edges:
    if union(u, v):
        total += w
print(total)`,
    },
  ],
};

function generateMCQuestion(level: ExamLevel, index: number) {
  const templates = MC_TEMPLATES[level];
  const template = templates![index % templates!.length]!;
  const topics = LEVEL_TOPICS[level];
  const selectedTopics = pickRandomN(topics, 1 + Math.floor(Math.random() * 2));

  return {
    id: randomUUID(),
    type: 'mc' as QuestionType,
    questionIndex: index,
    questionText: template.stem,
    options: template.options.map((text, i) => ({
      label: String.fromCharCode(65 + i) as 'A' | 'B' | 'C' | 'D',
      text,
    })) as ExtractedOption[],
    answer: template.answer,
    explanation: `${template.stem} 正确答案是${template.answer}。${template.options['ABCD'.indexOf(template.answer)]}是正确的。`,
    topics: selectedTopics,
    difficulty: 'medium',
    images: null,
    codeBlocks: null,
    inputFormat: null,
    outputFormat: null,
    constraints: null,
    sampleInput: null,
    sampleOutput: null,
    templateCode: null,
    testCases: null,
    createdAt: new Date().toISOString(),
  };
}

function generateTFQuestion(level: ExamLevel, index: number) {
  const templates = TF_TEMPLATES[level];
  const template = templates![(index - 16) % templates!.length]!;
  const topics = LEVEL_TOPICS[level];
  const selectedTopics = pickRandomN(topics, 1);

  return {
    id: randomUUID(),
    type: 'tf' as QuestionType,
    questionIndex: index,
    questionText: template.stem,
    options: null,
    answer: template.answer ? '对' : '错',
    explanation: `${template.stem} 这个说法是${template.answer ? '正确' : '错误'}的。`,
    topics: selectedTopics,
    difficulty: 'medium',
    images: null,
    codeBlocks: null,
    inputFormat: null,
    outputFormat: null,
    constraints: null,
    sampleInput: null,
    sampleOutput: null,
    templateCode: null,
    testCases: null,
    createdAt: new Date().toISOString(),
  };
}

function generateProgrammingQuestion(level: ExamLevel, index: number) {
  const templates = PROGRAMMING_TEMPLATES[level];
  const template = templates![(index - 26) % templates!.length]!;
  const topics = LEVEL_TOPICS[level];
  const selectedTopics = pickRandomN(topics, 2);

  const testCases = template.sampleInputs.map((inp, i) => ({
    input: inp,
    expected: template.sampleOutputs[i]!,
    isSample: true,
  }));

  return {
    id: randomUUID(),
    type: 'programming' as QuestionType,
    questionIndex: index,
    questionText: `${template.title}\n\n${template.description}`,
    options: null,
    answer: template.referenceSolution,
    explanation: `解题思路：${template.description}`,
    topics: selectedTopics,
    difficulty: 'hard',
    images: null,
    codeBlocks: [template.referenceSolution],
    inputFormat: template.inputFormat,
    outputFormat: template.outputFormat,
    constraints: template.constraints,
    sampleInput: template.sampleInputs[0] ?? null,
    sampleOutput: template.sampleOutputs[0] ?? null,
    templateCode: null,
    testCases,
    createdAt: new Date().toISOString(),
  };
}

function generateAllQuestions(level: ExamLevel) {
  const questions = [];

  for (let i = 1; i <= 15; i++) {
    questions.push(generateMCQuestion(level, i));
  }

  for (let i = 16; i <= 25; i++) {
    questions.push(generateTFQuestion(level, i));
  }

  for (let i = 26; i <= 27; i++) {
    questions.push(generateProgrammingQuestion(level, i));
  }

  return questions;
}

function main() {
  let totalFiles = 0;

  for (const session of SESSIONS_LIST) {
    for (const level of LEVELS) {
      const sessionDir = path.join(OUTPUT_DIR, session);
      fs.mkdirSync(sessionDir, { recursive: true });

      const questions = generateAllQuestions(level);
      const output = {
        session,
        level,
        totalQuestions: questions.length,
        mock: true,
        questions,
        generatedAt: new Date().toISOString(),
      };

      const outputPath = path.join(sessionDir, `level-${level}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
      totalFiles++;
    }
  }

  console.log(`Generated ${totalFiles} mock data files in ${OUTPUT_DIR}`);
  console.log(`Sessions: ${SESSIONS_LIST.length}, Levels: ${LEVELS.length}`);
  console.log(`Questions per file: 27 (15 MC + 10 TF + 2 programming)`);
}

main();
