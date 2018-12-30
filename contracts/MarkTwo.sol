pragma solidity ^0.4.24;

contract MarkTwo {
    // 发起者
    address public owner;
    
    // 结束时间
    uint public endtime;
    
    // 中奖的普通数字
    uint8 public normal;
    // 中奖的特殊数字
    uint8 public extra;
    // 是否开奖
    bool public drawed;

    // 每个奖的奖金，prizes[0] 为特奖奖金
    uint[2] public prizes;

    // 保存每个账号所购彩票的结构
    struct lottery {
        uint8 normal;
        uint8 extra;
    }
    
    // 映射到选择某个普通数字的所有账号
    mapping (uint8 => address[]) public normal_record;
    // 映射到选择某个特别数字的所有账号
    mapping (uint8 => address[]) public extra_record;
    
    // 映射每个账号所购的彩票（避免 for 的使用）
    mapping (address => lottery) public record;

    // 标记某个用户是否已买过
    mapping (address => bool) public bought;

    // 标记某个用户是否已领奖
    mapping (address => bool) public got;

    // 记录参与者（用于生成开奖结果）
    address[] participants;

    // 非发起者才能参与
    modifier onlyBuyer() {
        require(msg.sender != owner, 'NOWNER');
        _;
    }

    /**
    * @param e 结束时间的时间戳
    */
    constructor(uint e) public payable {
        require(now < e, 'EENDTIME');
        endtime = e;
        owner = msg.sender;
        drawed = false;
    }
    
    /**
    * 购买彩票
    * @param n 所选普通号码
    * @param e 所选特别号码
    */
    function buy(uint8 n, uint8 e) public payable onlyBuyer {
        address buyer = msg.sender;
        // 未结束
        require(now < endtime, 'FINISHED');
        // 支付 1 ether
        require(msg.value == 1 ether, 'NMONEY');
        // 合法的彩票数字
        require(n <= 36 && n > 0 && e > 0 && e <= 72, 'ENUMBER');
        // 未买过
        require(bought[buyer] == false, 'BOUGHT');

        // 记录
        normal_record[n].push(buyer);
        extra_record[e].push(buyer);
        
        record[buyer].normal = n;
        record[buyer].extra = e;
        
        bought[buyer] = true;
        participants.push(buyer);
    }
    
    /**
    * 开奖
    */
    function draw() public {
        // 已经结束
        require(now > endtime, 'NFINISHED');
        // 未开奖
        require(!drawed, 'FINISHED');

        // 生成结果
        uint n_ran = uint(this) ^ now ^ 2699;
        uint e_ran = uint(owner) ^ n_ran ^ 3571;
        for (uint i = 0; i < participants.length; ++i) {
            n_ran ^= uint(participants[i]);
            e_ran ^= uint(participants[i]);
        }
        normal = uint8(n_ran % 36) + 1;
        extra = uint8(e_ran % 72) + 1;
        
        // 计算奖金
        if (extra_record[extra].length != 0)
            prizes[0] = address(this).balance * 3 / 4 / extra_record[extra].length;
        if (normal_record[normal].length != 0)
            prizes[1] = address(this).balance * 1 / 4 / normal_record[normal].length;
        
        // 开奖结束        
        drawed = true;
    }

    /**
    * 获得当前奖池大小
    */
    function getPool() public view returns(uint) {
        return address(this).balance;
    }

    /**
    * 领奖
    */
    function giveOnePrize() public onlyBuyer {
        // 还未开奖则开奖
        if (!drawed) draw();

        address buyer = msg.sender;

        // 买过且没领过奖
        require(bought[buyer], 'NBOUGT');
        require(!got[buyer], 'GOT');

        if (record[buyer].extra == extra) {
            // 特奖
            buyer.transfer(prizes[0]);
        } else if (record[buyer].normal == normal) {
            // 普奖
            buyer.transfer(prizes[1]);
        }
        got[buyer] = true;
    }
}