// BOJ - 2075 N번째 큰 수

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    priority_queue<int, vector<int>, greater<int> > pq;
    loop(i, 1, n * n) {
        int k; cin >> k;
        pq.push(k); if(pq.size() > n) pq.pop();
    }
    cout << pq.top() << '\n';
}