// BOJ - 1417 국회의원 선거 ( EC#3 - Problem 08 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n, x, x0; cin >> n >> x; x0 = x;
    priority_queue<int> pq;
    loop(i, 2, n) {
        int k; cin >> k; pq.push(k);
    }

    if(n != 1) {
        while(pq.top() >= x) {
            int k = pq.top() - 1; pq.pop();
            pq.push(k); x++;
        }
    }
    cout << x - x0 << '\n';
}