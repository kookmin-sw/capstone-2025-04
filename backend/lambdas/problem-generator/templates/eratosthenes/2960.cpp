// BOJ - 2960 에라토스테네스의 체

#include <bits/stdc++.h>
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n, k; cin >> n >> k;
    int notprime[n + 1] = {1, 1, 0};
    for(int i = 2; i <= n; i++) {
        if(!notprime[i]) {
            for(int j = 1; i * j <= n; j++) { // 1부터 한 이유는 소수도 지우기 때문에
                if(!notprime[i * j]) k--; // 이미 지워진 것은 못 지우게
                notprime[i * j] = 1;
                if(!k) { cout << (i * j) << '\n'; return 0; }
            }
        }
    }
}