#include<iostream>
#include<vector>
#include<cmath>
#include<algorithm>
#include<stack>
 
using namespace std;
 
//sort 기준 
bool comp(const pair<int, int> &p1,const pair<int, int> &p2){
    
    if(p1.second == p2.second){     //빈도수가 같으면 
        return p1.first < p2.first; //숫자(key)작은게 앞으로 
    }
    return p1.second > p2.second;    //다르면 빈도수가 큰게 앞으로 
    
}
 
int main(void){
    //입력 1
    int n;
    cin >> n;
    
    vector<int> v;
    int    key;     
    double sum=0;    //산술평균용 
    
    //입력 2    
    for(int i=0; i<n ;i++){
        cin >> key;        
        v.push_back(key);
        
        sum += key;
    }
    
    //오름차순으로 정렬. 
    sort(v.begin(), v.end());    
    
    //산술평균 출력. 
    //내림함수를 이용하여 반올림.
    cout <<  (int)floor( (sum / n) + 0.5) << endl;
    
    
    //중앙값. 
    cout << v[n/2] << endl;
    
    
    //최빈값. 
    vector<pair<int,int> > st;            //key 와 빈도수를 저장할 pair형 vector. 
    vector<int>::size_type i;
    
    for(i=0; i<v.size(); i++){
        if(st.empty()){
            st.push_back(pair<int,int>(v[i],1));
            continue;
        } 
 
        if(st.back().first == v[i]){        //같은게 있다면 
        
            pair<int, int> tmp = st.back();    
            tmp.second++;                    //하나 증가 
            st.pop_back();                    //기존것 없애고 
            st.push_back(tmp);                //새로운 것 다시 삽입 
        
        }else{ 
            st.push_back(pair<int,int>(v[i],1));    
        }
    }
    
 
    //빈도수가 높고, 숫자(key)가 낮은 순으로 정렬 
    sort(st.begin(), st.end(), comp); 
    
    if(st[0].second == st[1].second){
        cout << st[1].first << endl;
    }else{
        cout << st[0].first << endl;
    }
    
    
    //범위.
    cout << v.back() - v.front() << endl;
    
    
    return 0;    
}

