// BOJ - 1747 소수&팰린드롬

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 1500001
 
using namespace std;

int notprime[MAXN] = {0, 1, 0, 0};
void eratosthenes() {
    for(int i = 2; i * i < MAXN; i++)
        if(!notprime[i])
            for(int j = 2; i * j < MAXN; j++)
                notprime[i * j] = 1;
}
int palin(int k) {
    int kk = k, kkk = 0;
    while(kk) {
        kkk = kkk * 10 + kk % 10; kk /= 10;
    }
    if(kkk == k) return 1;
    return 0;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    eratosthenes();

    int n; cin >> n;
    loop(i, n, MAXN)
        if(!notprime[i] && palin(i)) {
            cout << i << '\n'; break;
        }
}